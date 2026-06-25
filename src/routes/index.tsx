import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Clock, LogOut, Moon, Play, Square, Sun, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { TimeInput } from "@/components/time-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/lib/theme"
import {
  createTimeEntry,
  deleteTimeEntry,
  formatDuration,
  formatDurationEditable,
  getTimeEntries,
  groupEntriesByDay,
  parseDurationToMs,
  parseTimeOfDay,
  type TimeEntry,
  totalDurationForDay,
  totalEarningsForDay,
  updateTimeEntry,
} from "@/lib/time-entries"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const { user, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!user) return null

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Time Tracker</h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <Timer />
    </div>
  )
}

const formatTimeValue = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

const ghostInput =
  "h-auto border-transparent bg-transparent px-1.5 py-0.5 shadow-none transition-[border-color] duration-200 group-hover/card:border-input dark:bg-transparent"

function Timer() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [description, setDescription] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [elapsed, setElapsed] = useState("")
  const [activeStartTime, setActiveStartTime] = useState("")
  const [loadingEntries, setLoadingEntries] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadEntries = useCallback(async () => {
    try {
      const data = await getTimeEntries()
      setEntries(data)
      const running = data.find((e) => !e.end_time)
      if (running) {
        setActiveEntry(running)
        setDescription(running.description)
        setHourlyRate(running.hourly_rate ? String(running.hourly_rate) : "")
        setActiveStartTime(formatTimeValue(running.start_time))
      } else {
        const lastCompleted = data.find((e) => e.end_time)
        if (lastCompleted?.hourly_rate) {
          setHourlyRate(String(lastCompleted.hourly_rate))
        }
      }
    } catch (err) {
      console.error("Failed to load entries:", err)
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

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
  }, [activeEntry])

  async function handleStart() {
    let trimmed = description.trim()
    if (!trimmed) {
      const lastCompleted = entries.find((e) => e.end_time)
      if (!lastCompleted) return
      trimmed = lastCompleted.description
      setDescription(trimmed)
    }
    try {
      const parsedRate = parseFloat(hourlyRate)
      const startIso = new Date().toISOString()
      const entry = await createTimeEntry({
        description: trimmed,
        start_time: startIso,
        hourly_rate: Number.isNaN(parsedRate) ? undefined : parsedRate,
      })
      setActiveEntry(entry)
      setActiveStartTime(formatTimeValue(startIso))
      setEntries((prev) => [entry, ...prev])
    } catch (err) {
      console.error("Failed to start timer:", err)
    }
  }

  async function handleStop() {
    if (!activeEntry) return
    try {
      const updated = await updateTimeEntry(activeEntry.id, {
        end_time: new Date().toISOString(),
      })
      setActiveEntry(null)
      setDescription("")
      setHourlyRate(updated.hourly_rate ? String(updated.hourly_rate) : "")
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } catch (err) {
      console.error("Failed to stop timer:", err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTimeEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (activeEntry?.id === id) {
        setActiveEntry(null)
        setDescription("")
      }
    } catch (err) {
      console.error("Failed to delete entry:", err)
    }
  }

  async function handleUpdate(id: string, updates: Parameters<typeof updateTimeEntry>[1]) {
    try {
      const updated = await updateTimeEntry(id, updates)
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      if (activeEntry?.id === id) {
        setActiveEntry(updated)
        setActiveStartTime(formatTimeValue(updated.start_time))
      }
    } catch (err) {
      console.error("Failed to update entry:", err)
    }
  }

  const grouped = groupEntriesByDay(entries)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
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
                onBlur={() => {
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

function TimeEntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: TimeEntry
  onUpdate: (id: string, updates: Parameters<typeof updateTimeEntry>[1]) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [desc, setDesc] = useState(entry.description)
  const [startTime, setStartTime] = useState(() => formatTimeValue(entry.start_time))
  const [endTime, setEndTime] = useState(() => (entry.end_time ? formatTimeValue(entry.end_time) : ""))
  const [duration, setDuration] = useState(() => formatDurationEditable(entry.start_time, entry.end_time))
  const [rate, setRate] = useState(() => entry.hourly_rate || 0)

  useEffect(() => {
    setDesc(entry.description)
    setStartTime(formatTimeValue(entry.start_time))
    setEndTime(entry.end_time ? formatTimeValue(entry.end_time) : "")
    setDuration(formatDurationEditable(entry.start_time, entry.end_time))
    setRate(entry.hourly_rate || 0)
  }, [entry.start_time, entry.end_time, entry.description, entry.hourly_rate])

  const saveDescription = async () => {
    const trimmed = desc.trim()
    if (!trimmed) {
      setDesc(entry.description)
      return
    }
    if (trimmed !== entry.description) {
      await onUpdate(entry.id, { description: trimmed })
    }
  }

  const saveStartTime = async () => {
    const parsed = parseTimeOfDay(startTime)
    if (!parsed) {
      setStartTime(formatTimeValue(entry.start_time))
      return
    }
    const d = new Date(entry.start_time)
    d.setHours(parsed.hours, parsed.minutes, 0, 0)
    const newIso = d.toISOString()
    if (newIso !== entry.start_time) {
      await onUpdate(entry.id, { start_time: newIso })
    } else {
      setStartTime(formatTimeValue(entry.start_time))
    }
  }

  const saveEndTime = async () => {
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
      await onUpdate(entry.id, { end_time: newIso })
    } else {
      setEndTime(formatTimeValue(entry.end_time))
    }
  }

  const saveRate = async () => {
    if (rate !== (entry.hourly_rate || 0)) {
      await onUpdate(entry.id, { hourly_rate: rate })
    }
  }

  const saveDuration = async () => {
    const ms = parseDurationToMs(duration)
    if (ms == null || !entry.end_time) {
      setDuration(formatDurationEditable(entry.start_time, entry.end_time))
      return
    }
    const newEnd = new Date(new Date(entry.start_time).getTime() + ms)
    const newEndIso = newEnd.toISOString()
    if (newEndIso !== entry.end_time) {
      await onUpdate(entry.id, { end_time: newEndIso })
    }
  }

  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
            }}
            className={cn("truncate font-medium", ghostInput)}
          />
          <div className="flex items-center gap-1">
            <TimeInput
              value={startTime}
              onValueChange={setStartTime}
              onSave={saveStartTime}
              className={cn("w-13 text-xs text-muted-foreground", ghostInput)}
            />
            <span className="text-xs text-muted-foreground">–</span>
            {entry.end_time ? (
              <TimeInput
                value={endTime}
                onValueChange={setEndTime}
                onSave={saveEndTime}
                className={cn("w-13 text-xs text-muted-foreground", ghostInput)}
              />
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
                onBlur={saveRate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur()
                }}
                placeholder="0"
                /* hide number input arrows */
                className={cn("w-14 shrink-0 text-right text-xs", ghostInput)}
              />
              <span className="text-xs text-muted-foreground">€/h</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex flex-col items-end">
            {entry.end_time ? (
              <TimeInput
                value={duration}
                onValueChange={setDuration}
                onSave={saveDuration}
                className={cn("w-16 shrink-0 text-right font-mono text-sm", ghostInput)}
              />
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
            <span className={cn("px-1.5 text-xs text-muted-foreground", rate <= 0 && "invisible")}>
              {(
                ((new Date(entry.end_time || new Date()).getTime() - new Date(entry.start_time).getTime()) / 3600000) *
                (rate || 0)
              ).toFixed(2)}{" "}
              €
            </span>
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onDelete(entry.id)}
            aria-label="Delete entry"
            className="self-center"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
