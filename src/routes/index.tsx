import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import {
  createTimeEntry,
  deleteTimeEntry,
  formatDuration,
  formatTime,
  getTimeEntries,
  groupEntriesByDay,
  type TimeEntry,
  totalDurationForDay,
  updateTimeEntry,
} from "@/lib/time-entries"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const { user, loading } = useAuth()
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
        <h1 className="text-2xl font-bold">Time Tracker</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            Sign out
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState("")
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

  async function handleEditSave(id: string) {
    const trimmed = editDescription.trim()
    if (!trimmed) return
    try {
      const updated = await updateTimeEntry(id, { description: trimmed })
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      if (activeEntry?.id === id) {
        setActiveEntry(updated)
      }
      setEditingId(null)
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
              <Button variant="destructive" onClick={handleStop} className="shrink-0">
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={!description.trim()} className="shrink-0">
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
                <Card key={entry.id} size="sm">
                  <CardContent className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {editingId === entry.id ? (
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            handleEditSave(entry.id)
                          }}
                        >
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" type="submit">
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" type="button" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <>
                          <span className="truncate font-medium">{entry.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(entry.start_time)}
                            {entry.end_time ? ` – ${formatTime(entry.end_time)}` : " – running"}
                          </span>
                        </>
                      )}
                    </div>
                    {editingId !== entry.id && (
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-sm">
                          {formatDuration(entry.start_time, entry.end_time)}
                        </span>
                        {!activeEntry || activeEntry.id !== entry.id ? (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(entry.id)
                              setEditDescription(entry.description)
                            }}
                          >
                            ✏️
                          </Button>
                        ) : null}
                        <Button size="icon-xs" variant="ghost" onClick={() => handleDelete(entry.id)}>
                          🗑
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
