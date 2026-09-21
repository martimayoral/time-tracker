import { Check, CircleAlert, CloudUpload, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ClockifyError, isClockifyConfigured, pushEntryToClockify, useClockifyStore } from "@/lib/clockify"
import type { TimeEntry } from "@/lib/time-entries"
import { cn } from "@/lib/utils"

export function ClockifyButton({ entry }: { entry: TimeEntry }) {
  const config = useClockifyStore((s) => s.config)
  const pushedId = useClockifyStore((s) => s.pushed[entry.id])
  const markPushed = useClockifyStore((s) => s.markPushed)
  const setSettingsOpen = useClockifyStore((s) => s.setSettingsOpen)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const configured = isClockifyConfigured(config)
  const running = !entry.end_time

  async function handlePush() {
    if (!configured) {
      setSettingsOpen(true)
      return
    }
    setPushing(true)
    setError(null)
    try {
      markPushed(entry.id, await pushEntryToClockify(config, entry))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send to Clockify")
      if (err instanceof ClockifyError && err.expiredToken) setSettingsOpen(true)
    } finally {
      setPushing(false)
    }
  }

  const label = pushedId
    ? "Already sent to Clockify"
    : running
      ? "Stop the entry before sending it to Clockify"
      : error
        ? `Clockify: ${error}`
        : configured
          ? "Send to Clockify"
          : "Set up Clockify"

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      onClick={handlePush}
      disabled={pushing || running || !!pushedId}
      title={label}
      aria-label={label}
      className={cn(pushedId && "text-emerald-600 dark:text-emerald-500", !pushedId && error && "text-destructive")}
    >
      {pushing ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : pushedId ? (
        <Check className="size-3.5" />
      ) : error ? (
        <CircleAlert className="size-3.5" />
      ) : (
        <CloudUpload className="size-3.5" />
      )}
    </Button>
  )
}
