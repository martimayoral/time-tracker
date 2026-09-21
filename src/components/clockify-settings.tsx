import type * as React from "react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CLOCKIFY_DEFAULTS, type ClockifyConfig, tokenExpiresAt, useClockifyStore } from "@/lib/clockify"

function tokenStatus(token: string): { text: string; expired: boolean } | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  const expiry = tokenExpiresAt(trimmed)
  if (!expiry) return { text: "Unrecognised token format", expired: true }
  const minutesLeft = Math.round((expiry.getTime() - Date.now()) / 60000)
  if (minutesLeft <= 0) return { text: "Expired — copy a fresh token from Clockify", expired: true }
  return { text: `Valid for ${minutesLeft} min (until ${expiry.toLocaleTimeString()})`, expired: false }
}

export function ClockifySettingsDialog() {
  const open = useClockifyStore((s) => s.settingsOpen)
  const setOpen = useClockifyStore((s) => s.setSettingsOpen)
  const config = useClockifyStore((s) => s.config)
  const setConfig = useClockifyStore((s) => s.setConfig)
  const pushedCount = useClockifyStore((s) => Object.keys(s.pushed).length)
  const clearPushed = useClockifyStore((s) => s.clearPushed)
  const [draft, setDraft] = useState(config)

  useEffect(() => {
    if (open) setDraft(config)
  }, [open, config])

  const status = tokenStatus(draft.token)

  // ArrowRight on an empty field accepts the placeholder; with text in it the caret still moves normally.
  const fillDefault =
    (field: keyof ClockifyConfig) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key !== "ArrowRight" || e.currentTarget.value) return
      e.preventDefault()
      setDraft((d) => ({ ...d, [field]: CLOCKIFY_DEFAULTS[field] }))
    }

  const save = () => {
    setConfig({
      workspaceId: draft.workspaceId.trim(),
      projectId: draft.projectId.trim(),
      token: draft.token.trim(),
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clockify</DialogTitle>
          <DialogDescription>
            Entries are sent to the project below. The workspace and project ids are in the Clockify URL; the token is
            the <code>x-auth-token</code> header of any request app.clockify.me makes, and it expires after an hour.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clockify-workspace">Workspace ID</Label>
            <Input
              id="clockify-workspace"
              value={draft.workspaceId}
              onChange={(e) => setDraft((d) => ({ ...d, workspaceId: e.target.value }))}
              onKeyDown={fillDefault("workspaceId")}
              placeholder={CLOCKIFY_DEFAULTS.workspaceId}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clockify-project">Project ID</Label>
            <Input
              id="clockify-project"
              value={draft.projectId}
              onChange={(e) => setDraft((d) => ({ ...d, projectId: e.target.value }))}
              onKeyDown={fillDefault("projectId")}
              placeholder={CLOCKIFY_DEFAULTS.projectId}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clockify-token">Session token</Label>
            <Textarea
              id="clockify-token"
              value={draft.token}
              onChange={(e) => setDraft((d) => ({ ...d, token: e.target.value }))}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              rows={3}
              className="break-all font-mono text-xs"
            />
            {status && (
              <span className={status.expired ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {status.text}
              </span>
            )}
          </div>
          {pushedCount > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {pushedCount} {pushedCount === 1 ? "entry" : "entries"} marked as sent
              </span>
              <Button variant="outline" size="xs" onClick={clearPushed}>
                Clear markers
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
