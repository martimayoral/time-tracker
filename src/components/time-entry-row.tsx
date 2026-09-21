import { Trash2 } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"

import { ClockifyButton } from "@/components/clockify-button"
import { TimeInput } from "@/components/time-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAdvancedMode } from "@/lib/advanced-mode"
import {
  formatDuration,
  formatDurationEditable,
  parseDurationToMs,
  parseTimeOfDay,
  type TimeEntry,
  type updateTimeEntry,
} from "@/lib/time-entries"
import { cn } from "@/lib/utils"

const formatTimeValue = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

export const ghostInput =
  "h-auto border-transparent bg-transparent px-1.5 py-0.5 shadow-none transition-[border-color] duration-200 group-hover/card:border-input dark:bg-transparent"

export function TimeEntryFields({
  entry,
  onUpdate,
  onDelete,
  descriptionSlot,
}: {
  entry: TimeEntry
  onUpdate: (id: string, updates: Parameters<typeof updateTimeEntry>[3]) => void
  onDelete: (id: string) => void
  descriptionSlot?: React.ReactNode
}) {
  const [startTime, setStartTime] = useState(() => formatTimeValue(entry.start_time))
  const [endTime, setEndTime] = useState(() => (entry.end_time ? formatTimeValue(entry.end_time) : ""))
  const [duration, setDuration] = useState(() => formatDurationEditable(entry.start_time, entry.end_time))
  const [rate, setRate] = useState(() => entry.hourly_rate || 0)
  const focusedField = useRef<string | null>(null)
  const advancedMode = useAdvancedMode()

  useEffect(() => {
    if (focusedField.current !== "startTime") setStartTime(formatTimeValue(entry.start_time))
    if (focusedField.current !== "endTime") setEndTime(entry.end_time ? formatTimeValue(entry.end_time) : "")
    if (focusedField.current !== "duration") setDuration(formatDurationEditable(entry.start_time, entry.end_time))
    if (focusedField.current !== "rate") setRate(entry.hourly_rate || 0)
  }, [entry.start_time, entry.end_time, entry.hourly_rate])

  const saveStartTime = () => {
    const parsed = parseTimeOfDay(startTime)
    if (!parsed) {
      setStartTime(formatTimeValue(entry.start_time))
      return
    }
    const d = new Date(entry.start_time)
    d.setHours(parsed.hours, parsed.minutes, 0, 0)
    const newIso = d.toISOString()
    if (newIso !== entry.start_time) {
      onUpdate(entry.id, { start_time: newIso })
    } else {
      setStartTime(formatTimeValue(entry.start_time))
    }
  }

  const saveEndTime = () => {
    if (!entry.end_time) return
    const parsed = parseTimeOfDay(endTime)
    if (!parsed) {
      setEndTime(formatTimeValue(entry.end_time))
      return
    }
    const d = new Date(entry.end_time)
    d.setHours(parsed.hours, parsed.minutes, 0, 0)
    const newIso = d.toISOString()
    if (newIso !== entry.end_time) {
      onUpdate(entry.id, { end_time: newIso })
    } else {
      setEndTime(formatTimeValue(entry.end_time))
    }
  }

  const saveRate = () => {
    if (rate !== (entry.hourly_rate || 0)) {
      onUpdate(entry.id, { hourly_rate: rate })
    }
  }

  const saveDuration = () => {
    const ms = parseDurationToMs(duration)
    if (ms == null || !entry.end_time) {
      setDuration(formatDurationEditable(entry.start_time, entry.end_time))
      return
    }
    const newEnd = new Date(new Date(entry.start_time).getTime() + ms)
    const newEndIso = newEnd.toISOString()
    if (newEndIso !== entry.end_time) {
      onUpdate(entry.id, { end_time: newEndIso })
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {descriptionSlot}
      <div className="flex items-center gap-1">
        <span
          onFocus={() => {
            focusedField.current = "startTime"
          }}
          onBlur={() => {
            focusedField.current = null
          }}
        >
          <TimeInput
            value={startTime}
            onValueChange={setStartTime}
            onSave={saveStartTime}
            onCancel={() => setStartTime(formatTimeValue(entry.start_time))}
            className={cn("w-13 text-xs text-muted-foreground", ghostInput)}
          />
        </span>
        <span className="text-xs text-muted-foreground">–</span>
        {entry.end_time ? (
          <span
            onFocus={() => {
              focusedField.current = "endTime"
            }}
            onBlur={() => {
              focusedField.current = null
            }}
          >
            <TimeInput
              value={endTime}
              onValueChange={setEndTime}
              onSave={saveEndTime}
              onCancel={() => setEndTime(entry.end_time ? formatTimeValue(entry.end_time) : "")}
              className={cn("w-13 text-xs text-muted-foreground", ghostInput)}
            />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">running</span>
        )}
        <div className="flex items-center gap-0.5">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={rate || ""}
            onChange={(e) => {
              const num = parseFloat(e.target.value)
              setRate(Number.isNaN(num) ? 0 : num)
            }}
            onFocus={() => {
              focusedField.current = "rate"
            }}
            onBlur={() => {
              focusedField.current = null
              saveRate()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setRate(entry.hourly_rate || 0)
                e.currentTarget.blur()
              }
            }}
            placeholder="0"
            className={cn("w-14 shrink-0 text-right text-xs", ghostInput)}
          />
          <span className="text-xs text-muted-foreground">€/h</span>
        </div>
        <div className="flex items-center gap-1">
          {entry.end_time ? (
            <span
              onFocus={() => {
                focusedField.current = "duration"
              }}
              onBlur={() => {
                focusedField.current = null
              }}
            >
              <TimeInput
                mode="duration"
                value={duration}
                onValueChange={setDuration}
                onSave={saveDuration}
                onCancel={() => setDuration(formatDurationEditable(entry.start_time, entry.end_time))}
                className={cn("w-16 shrink-0 text-right font-mono text-sm", ghostInput)}
              />
            </span>
          ) : (
            <Input
              readOnly
              tabIndex={-1}
              value={formatDuration(entry.start_time, entry.end_time)}
              className={cn(
                "w-auto shrink-0 cursor-default text-right font-mono text-sm",
                ghostInput,
                "focus-visible:border-transparent focus-visible:ring-0"
              )}
            />
          )}
          {advancedMode && <ClockifyButton entry={entry} />}
          <Button size="icon-xs" variant="ghost" onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TimeEntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: TimeEntry
  onUpdate: (id: string, updates: Parameters<typeof updateTimeEntry>[3]) => void
  onDelete: (id: string) => void
}) {
  const [desc, setDesc] = useState(entry.description)
  const focusedField = useRef<string | null>(null)

  useEffect(() => {
    if (focusedField.current !== "desc") setDesc(entry.description)
  }, [entry.description])

  const saveDescription = () => {
    const trimmed = desc.trim()
    if (!trimmed) {
      setDesc(entry.description)
      return
    }
    if (trimmed !== entry.description) {
      onUpdate(entry.id, { description: trimmed })
    }
  }

  return (
    <Card size="sm">
      <CardContent className="py-2">
        <TimeEntryFields
          entry={entry}
          onUpdate={onUpdate}
          onDelete={onDelete}
          descriptionSlot={
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onFocus={() => {
                focusedField.current = "desc"
              }}
              onBlur={() => {
                focusedField.current = null
                saveDescription()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") {
                  setDesc(entry.description)
                  e.currentTarget.blur()
                }
              }}
              className={cn("truncate font-medium", ghostInput)}
            />
          }
        />
      </CardContent>
    </Card>
  )
}
