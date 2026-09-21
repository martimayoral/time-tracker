import { CircleAlert, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { ClockifyIcon } from "@/components/clockify-icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClockifyError, isClockifyConfigured, pushEntryToClockify, useClockifyStore } from "@/lib/clockify"
import type { TimeEntry } from "@/lib/time-entries"

export function ClockifyPushAllButton({ entries }: { entries: TimeEntry[] }) {
  const config = useClockifyStore((s) => s.config)
  const pushed = useClockifyStore((s) => s.pushed)
  const markPushed = useClockifyStore((s) => s.markPushed)
  const setSettingsOpen = useClockifyStore((s) => s.setSettingsOpen)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(0)
  const [error, setError] = useState<{ message: string; expiredToken: boolean } | null>(null)

  const pending = entries.filter((entry) => entry.end_time && !pushed[entry.id])
  const running = entries.filter((entry) => !entry.end_time).length

  function handleClick() {
    if (!isClockifyConfigured(config)) {
      setSettingsOpen(true)
      return
    }
    setSent(0)
    setError(null)
    setOpen(true)
  }

  // Sent entries are marked as they go, so a failed run can be resumed by sending again.
  async function send() {
    const alreadyPushed = useClockifyStore.getState().pushed
    const queue = entries.filter((entry) => entry.end_time && !alreadyPushed[entry.id])
    setSending(true)
    setSent(0)
    setError(null)
    try {
      let count = 0
      for (const entry of queue) {
        markPushed(entry.id, await pushEntryToClockify(config, entry))
        count += 1
        setSent(count)
      }
      setOpen(false)
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to send to Clockify",
        expiredToken: err instanceof ClockifyError && err.expiredToken,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleClick}
        disabled={pending.length === 0}
        title={
          pending.length === 0
            ? "Every entry in this range is already in Clockify"
            : `Send ${pending.length} ${pending.length === 1 ? "entry" : "entries"} to Clockify`
        }
      >
        <ClockifyIcon className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent showCloseButton={!sending}>
          <DialogHeader>
            <DialogTitle>Send to Clockify</DialogTitle>
            <DialogDescription>
              {pending.length} {pending.length === 1 ? "entry" : "entries"} from the selected range will be created in
              Clockify. Entries already sent are skipped
              {running > 0 &&
                `, and ${running === 1 ? "one running entry is" : `${running} running entries are`} left out`}
              .
            </DialogDescription>
          </DialogHeader>

          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Sending {Math.min(sent + 1, pending.length)} of {pending.length}...
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-2 text-sm text-destructive">
              <span className="flex items-center gap-2">
                <CircleAlert className="size-3.5 shrink-0" />
                {error.message}
              </span>
              <span className="text-muted-foreground">
                {sent} sent before the error — sending again resumes from there.
              </span>
            </div>
          )}

          <DialogFooter>
            {error?.expiredToken ? (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setSettingsOpen(true)
                }}
              >
                Open settings
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
            )}
            <Button onClick={send} disabled={sending || pending.length === 0}>
              {error ? "Retry" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
