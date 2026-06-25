import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Clock, LogOut, Moon, Play, Square, Sun, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

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
  type TimeEntry,
  totalDurationForDay,
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

function Timer() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [description, setDescription] = useState("")
  const [elapsed, setElapsed] = useState("")
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
    const trimmed = description.trim()
    if (!trimmed) return
    try {
      const entry = await createTimeEntry({
        description: trimmed,
        start_time: new Date().toISOString(),
      })
      setActiveEntry(entry)
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
      }
    } catch (err) {
      console.error("Failed to update entry:", err)
    }
  }

  const grouped = groupEntriesByDay(entries)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!activeEntry}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !activeEntry) handleStart()
              }}
            />
            {activeEntry ? (
              <Button variant="destructive" onClick={handleStop} className="shrink-0 gap-1.5">
                <Square className="size-3.5" />
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={!description.trim()} className="shrink-0 gap-1.5">
                <Play className="size-3.5" />
                Start
              </Button>
            )}
          </div>
          {activeEntry && (
            <div className="flex items-center gap-2 text-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="font-mono text-lg font-semibold">{elapsed}</span>
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
              <span className="text-sm font-medium text-muted-foreground">
                Total: {totalDurationForDay(dayEntries)}
              </span>
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

const formatTimeValue = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

const ghostInput =
  "h-auto border-transparent bg-transparent px-1.5 py-0.5 shadow-none transition-[border-color] duration-200 group-hover/card:border-input dark:bg-transparent"

const timePickerHidden =
  "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:transition-opacity group-hover/card:[&::-webkit-calendar-picker-indicator]:opacity-100"

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

  useEffect(() => {
    setDesc(entry.description)
    setStartTime(formatTimeValue(entry.start_time))
    setEndTime(entry.end_time ? formatTimeValue(entry.end_time) : "")
    setDuration(formatDurationEditable(entry.start_time, entry.end_time))
  }, [entry.start_time, entry.end_time, entry.description])

  const saveChanges = async () => {
    const updates: Parameters<typeof updateTimeEntry>[1] = {}
    const trimmed = desc.trim()
    if (!trimmed) {
      setDesc(entry.description)
      return
    }
    if (trimmed !== entry.description) updates.description = trimmed

    const origStart = formatTimeValue(entry.start_time)
    if (startTime && startTime !== origStart) {
      const d = new Date(entry.start_time)
      const [h, m] = startTime.split(":").map(Number)
      d.setHours(h, m, 0, 0)
      updates.start_time = d.toISOString()
    }

    if (entry.end_time && endTime) {
      const origEnd = formatTimeValue(entry.end_time)
      if (endTime !== origEnd) {
        const d = new Date(entry.end_time)
        const [h, m] = endTime.split(":").map(Number)
        d.setHours(h, m, 0, 0)
        updates.end_time = d.toISOString()
      }
    }

    if (Object.keys(updates).length > 0) {
      await onUpdate(entry.id, updates)
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
      <CardContent className="flex items-center justify-between gap-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveChanges}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
            }}
            className={cn("truncate font-medium", ghostInput)}
          />
          <div className="flex items-center gap-1">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={saveChanges}
              className={cn("w-auto text-xs text-muted-foreground", ghostInput, timePickerHidden)}
            />
            <span className="text-xs text-muted-foreground">–</span>
            {entry.end_time ? (
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                onBlur={saveChanges}
                className={cn("w-auto text-xs text-muted-foreground", ghostInput, timePickerHidden)}
              />
            ) : (
              <span className="text-xs text-muted-foreground">running</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {entry.end_time ? (
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={saveDuration}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
              }}
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
          <Button size="icon-xs" variant="ghost" onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
