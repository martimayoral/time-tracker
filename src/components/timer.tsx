import { Download, Play, Square } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"

import { TimeEntryRow } from "@/components/time-entry-row"
import { TimeInput } from "@/components/time-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { exportToPdf } from "@/lib/export-pdf"
import { useCreateEntry, useDeleteEntry, useTimeEntries, useUpdateEntry } from "@/lib/queries"
import {
  formatDuration,
  groupEntriesByDay,
  parseTimeOfDay,
  type TimeEntry,
  totalDurationForDay,
  totalEarningsForDay,
  type updateTimeEntry,
} from "@/lib/time-entries"
import { useTimerStore } from "@/lib/timer-store"
import { cn } from "@/lib/utils"

const formatTimeValue = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

const ghostInput =
  "h-auto border-transparent bg-transparent px-1.5 py-0.5 shadow-none transition-[border-color] duration-200 group-hover/card:border-input dark:bg-transparent"

export function Timer() {
  const { data: entries = [], isLoading: loadingEntries } = useTimeEntries()
  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()

  const activeEntry = entries.find((e) => !e.end_time) ?? null

  const description = useTimerStore((s) => s.description)
  const setDescription = useTimerStore((s) => s.setDescription)
  const hourlyRate = useTimerStore((s) => s.hourlyRate)
  const setHourlyRate = useTimerStore((s) => s.setHourlyRate)
  const elapsed = useTimerStore((s) => s.elapsed)
  const setElapsed = useTimerStore((s) => s.setElapsed)
  const activeStartTime = useTimerStore((s) => s.activeStartTime)
  const setActiveStartTime = useTimerStore((s) => s.setActiveStartTime)
  const dateRange = useTimerStore((s) => s.dateRange)
  const setDateRange = useTimerStore((s) => s.setDateRange)

  const prevActiveRef = useRef<TimeEntry | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const focusedField = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevActiveRef.current
    if (activeEntry && activeEntry.id !== prev?.id) {
      if (focusedField.current !== "description") setDescription(activeEntry.description)
      if (focusedField.current !== "hourlyRate")
        setHourlyRate(activeEntry.hourly_rate ? String(activeEntry.hourly_rate) : "")
      if (focusedField.current !== "activeStartTime") setActiveStartTime(formatTimeValue(activeEntry.start_time))
    } else if (activeEntry) {
      if (focusedField.current !== "description") setDescription(activeEntry.description)
      if (focusedField.current !== "hourlyRate")
        setHourlyRate(activeEntry.hourly_rate ? String(activeEntry.hourly_rate) : "")
      if (focusedField.current !== "activeStartTime") setActiveStartTime(formatTimeValue(activeEntry.start_time))
    } else if (!activeEntry && prev) {
      setDescription("")
      if (prev.hourly_rate) setHourlyRate(String(prev.hourly_rate))
    } else if (!activeEntry && !prev && entries.length > 0) {
      const lastCompleted = entries.find((e) => e.end_time)
      if (lastCompleted?.hourly_rate) {
        setHourlyRate(String(lastCompleted.hourly_rate))
      }
    }
    prevActiveRef.current = activeEntry
  }, [activeEntry, entries, setDescription, setHourlyRate, setActiveStartTime])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (link) link.href = activeEntry ? "/clock-active.png" : "/clock-inactive.png"
  }, [activeEntry])

  useEffect(() => {
    if (activeEntry) {
      const tick = () => setElapsed(formatDuration(activeEntry.start_time, null))
      tick()
      intervalRef.current = setInterval(tick, 1000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
    setElapsed("")
  }, [activeEntry, setElapsed])

  function handleStart() {
    let trimmed = description.trim()
    if (!trimmed) {
      const lastCompleted = entries.find((e) => e.end_time)
      if (!lastCompleted) return
      trimmed = lastCompleted.description
      setDescription(trimmed)
    }
    const parsedRate = parseFloat(hourlyRate)
    const startIso = new Date().toISOString()
    setActiveStartTime(formatTimeValue(startIso))
    createEntry.mutate({
      description: trimmed,
      start_time: startIso,
      hourly_rate: Number.isNaN(parsedRate) ? undefined : parsedRate,
    })
  }

  function handleStop() {
    if (!activeEntry) return
    updateEntry.mutate({
      id: activeEntry.id,
      updates: { end_time: new Date().toISOString() },
    })
  }

  function handleDelete(id: string) {
    deleteEntry.mutate(id)
  }

  function handleUpdate(id: string, updates: Parameters<typeof updateTimeEntry>[3]) {
    updateEntry.mutate({ id, updates })
    if (activeEntry?.id === id && updates.start_time) {
      setActiveStartTime(formatTimeValue(updates.start_time))
    }
  }

  const filteredEntries = useMemo(() => {
    const fromMs = dateRange.from.getTime()
    const toMs = dateRange.to.getTime()
    return entries.filter((e) => {
      const t = new Date(e.start_time).getTime()
      return t >= fromMs && t <= toMs
    })
  }, [entries, dateRange])

  const grouped = groupEntriesByDay(filteredEntries)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => {
                focusedField.current = "description"
              }}
              onBlur={() => {
                focusedField.current = null
                if (activeEntry && description.trim() && description.trim() !== activeEntry.description) {
                  handleUpdate(activeEntry.id, { description: description.trim() })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (activeEntry) e.currentTarget.blur()
                  else handleStart()
                }
              }}
            />
            <div className="flex shrink-0 items-center gap-0.5">
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                onFocus={() => {
                  focusedField.current = "hourlyRate"
                }}
                onBlur={() => {
                  focusedField.current = null
                  if (activeEntry) {
                    const parsed = parseFloat(hourlyRate)
                    const newRate = Number.isNaN(parsed) ? 0 : parsed
                    if (newRate !== (activeEntry.hourly_rate || 0)) {
                      handleUpdate(activeEntry.id, { hourly_rate: newRate })
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (activeEntry) e.currentTarget.blur()
                    else handleStart()
                  }
                }}
                className="w-16 text-right text-sm"
              />
              <span className="text-xs text-muted-foreground">€/h</span>
            </div>
            {activeEntry ? (
              <Button variant="destructive" onClick={handleStop} className="shrink-0 gap-1.5">
                <Square className="size-3.5" />
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} className="shrink-0 gap-1.5">
                <Play className="size-3.5" />
                Start
              </Button>
            )}
          </div>
          {activeEntry && (
            <div className="flex items-center gap-2 text-sm">
              <span
                onFocus={() => {
                  focusedField.current = "activeStartTime"
                }}
                onBlur={() => {
                  focusedField.current = null
                }}
              >
                <TimeInput
                  value={activeStartTime}
                  onValueChange={setActiveStartTime}
                  onSave={() => {
                    const parsed = parseTimeOfDay(activeStartTime)
                    if (!parsed) {
                      setActiveStartTime(formatTimeValue(activeEntry.start_time))
                      return
                    }
                    const d = new Date(activeEntry.start_time)
                    d.setHours(parsed.hours, parsed.minutes, 0, 0)
                    const newIso = d.toISOString()
                    if (newIso !== activeEntry.start_time && d.getTime() < Date.now()) {
                      handleUpdate(activeEntry.id, { start_time: newIso })
                    } else {
                      setActiveStartTime(formatTimeValue(activeEntry.start_time))
                    }
                  }}
                  className={cn("w-14 text-muted-foreground", ghostInput, "text-base!")}
                />
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: "-1h", deltaMs: 3600000 },
                  { label: "-15m", deltaMs: 900000 },
                  { label: "+15m", deltaMs: -900000 },
                  { label: "+1h", deltaMs: -3600000 },
                ].map(({ label, deltaMs }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs font-mono"
                    onClick={() => {
                      const newStart = new Date(new Date(activeEntry.start_time).getTime() - deltaMs)
                      if (newStart.getTime() < Date.now()) {
                        handleUpdate(activeEntry.id, { start_time: newStart.toISOString() })
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <span className="ml-auto font-mono text-lg font-semibold">{elapsed}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <DateRangePicker
          initialDateFrom={dateRange.from}
          initialDateTo={dateRange.to}
          onUpdate={({ range }) => {
            const from = new Date(range.from)
            from.setHours(0, 0, 0, 0)
            const to = new Date(range.to ?? range.from)
            to.setHours(23, 59, 59, 999)
            setDateRange({ from, to })
          }}
          align="start"
        />
        {filteredEntries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportToPdf(filteredEntries, dateRange.from, dateRange.to)}
          >
            <Download className="size-3.5" />
            Export PDF
          </Button>
        )}
      </div>

      {loadingEntries ? (
        <p className="text-center text-sm text-muted-foreground">Loading entries...</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No time entries yet. Start tracking!</p>
      ) : (
        Array.from(grouped.entries()).map(([day, dayEntries]) => (
          <div key={day} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{day}</h2>
              <div className="flex items-end gap-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Total: {totalDurationForDay(dayEntries)}
                </span>
                {totalEarningsForDay(dayEntries) > 0 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {totalEarningsForDay(dayEntries).toFixed(2)} €
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {dayEntries.map((entry) => (
                <TimeEntryRow key={entry.id} entry={entry} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
