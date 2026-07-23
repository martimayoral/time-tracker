import { StickyNote, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ghostInput, TimeEntryFields } from "@/components/time-entry-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type TimeEntry, totalDurationForDay, totalEarningsForDay, type updateTimeEntry } from "@/lib/time-entries"
import { cn } from "@/lib/utils"

export function TimeEntryGroup({
  entries,
  onUpdate,
  onDelete,
}: {
  entries: TimeEntry[]
  onUpdate: (id: string, updates: Parameters<typeof updateTimeEntry>[3]) => void
  onDelete: (id: string) => void
}) {
  const firstEntry = entries[0]
  const [title, setTitle] = useState(firstEntry.description)
  const [notes, setNotes] = useState(firstEntry.notes)
  const [showNotes, setShowNotes] = useState(() => !!firstEntry.notes)
  const focusedField = useRef<string | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const focusOnOpenRef = useRef(false)

  useEffect(() => {
    if (focusedField.current !== "title") setTitle(firstEntry.description)
  }, [firstEntry.description])

  useEffect(() => {
    if (focusedField.current !== "notes") setNotes(firstEntry.notes)
  }, [firstEntry.notes])

  useEffect(() => {
    if (showNotes && focusOnOpenRef.current) {
      notesRef.current?.focus()
      focusOnOpenRef.current = false
    }
  }, [showNotes])

  const saveTitle = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitle(firstEntry.description)
      return
    }
    for (const entry of entries) {
      if (entry.description !== trimmed) onUpdate(entry.id, { description: trimmed })
    }
    setTitle(trimmed)
  }

  const saveNotes = () => {
    const trimmed = notes.trim()
    if (trimmed !== firstEntry.notes) {
      onUpdate(firstEntry.id, { notes: trimmed })
    }
    setNotes(trimmed)
  }

  return (
    <Card size="sm">
      <CardContent className="flex gap-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => {
              focusedField.current = "title"
            }}
            onBlur={() => {
              focusedField.current = null
              saveTitle()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setTitle(firstEntry.description)
                e.currentTarget.blur()
              }
            }}
            className={cn("truncate font-medium", ghostInput)}
          />
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <TimeEntryFields key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
          {showNotes && (
            <Textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => {
                focusedField.current = "notes"
              }}
              onBlur={() => {
                focusedField.current = null
                saveNotes()
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNotes(firstEntry.notes)
                  e.currentTarget.blur()
                }
              }}
              placeholder="Add a note..."
              className="min-h-14 text-sm"
            />
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          <span className="text-sm font-semibold">{totalDurationForDay(entries)}</span>
          {totalEarningsForDay(entries) > 0 && (
            <span className="text-xs text-muted-foreground">{totalEarningsForDay(entries).toFixed(2)} €</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-1 py-1.5">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() =>
            setShowNotes((v) => {
              const next = !v
              if (next) focusOnOpenRef.current = true
              return next
            })
          }
          aria-label={showNotes ? "Hide note" : "Add note for the group"}
        >
          <StickyNote className={cn("size-3.5", firstEntry.notes && "fill-current")} />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => {
            for (const entry of entries) onDelete(entry.id)
          }}
          aria-label="Delete group"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
