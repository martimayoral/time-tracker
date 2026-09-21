import { Check, CircleAlert, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ClockifyError, isClockifyConfigured, pushEntryToClockify, useClockifyStore } from "@/lib/clockify"
import type { TimeEntry } from "@/lib/time-entries"
import { cn } from "@/lib/utils"

function ClockifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.974 10.995l7.25-7.349 2.073 2.104-7.25 7.349-2.078-2.104zM17.036 18.51c-0.688 0-1.344-0.276-1.823-0.771s-0.745-1.156-0.745-1.844c0-1.443 1.146-2.615 2.563-2.615 1.422 0 2.573 1.172 2.573 2.615 0 0.688-0.266 1.349-0.75 1.844-0.479 0.49-1.135 0.771-1.818 0.771zM29.328 26.104l-2.073 2.104-7.25-7.354 2.078-2.099zM17.115 27.203c1.417 0 2.818-0.276 4.125-0.818l3.542 3.594c-2.339 1.323-4.979 2.021-7.667 2.021-8.719 0-15.781-7.161-15.781-16s7.068-16 15.781-16c2.755 0 5.349 0.719 7.599 1.979l-3.479 3.536c-1.307-0.542-2.708-0.818-4.12-0.818-6.104 0-11.052 5.042-11.052 11.255s4.948 11.25 11.052 11.25z" />
    </svg>
  )
}

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
        <ClockifyIcon className="size-3.5" />
      )}
    </Button>
  )
}
