import { StickyNote } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { TimeEntryGroup } from "@/components/time-entry-group"
import { TimeEntryRow } from "@/components/time-entry-row"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  groupEntriesByDescription,
  type TimeEntry,
  totalDurationForDay,
  totalEarningsForDay,
  type updateTimeEntry,
} from "@/lib/time-entries"
import { cn } from "@/lib/utils"

export function DayGroup({
  day,
  dayEntries,
  onUpdate,
  onDelete,
}: {
  day: string
  dayEntries: TimeEntry[]
  onUpdate: (id: string, updates: Parameters<typeof updateTimeEntry>[3]) => void
  onDelete: (id: string) => void
}) {
  const firstEntry = dayEntries[0]
  const [notes, setNotes] = useState(firstEntry.notes)
  const [showNotes, setShowNotes] = useState(() => !!firstEntry.notes)
  const focusedField = useRef<string | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const focusOnOpenRef = useRef(false)

  useEffect(() => {
    if (focusedField.current !== "notes") setNotes(firstEntry.notes)
  }, [firstEntry.notes])

  useEffect(() => {
    if (showNotes && focusOnOpenRef.current) {
      notesRef.current?.focus()
      focusOnOpenRef.current = false
    }
  }, [showNotes])

  const saveNotes = () => {
    const trimmed = notes.trim()
    if (trimmed !== firstEntry.notes) {
      onUpdate(firstEntry.id, { notes: trimmed })
    }
    setNotes(trimmed)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold">{day}</h2>
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
            aria-label={showNotes ? "Hide note" : "Add note for the day"}
          >
            <StickyNote className={cn("size-3.5", firstEntry.notes && "fill-current")} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Total: {totalDurationForDay(dayEntries)}</span>
          {totalEarningsForDay(dayEntries) > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {totalEarningsForDay(dayEntries).toFixed(2)} €
            </span>
          )}
        </div>
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
          placeholder="Add a note for the day..."
          className="min-h-14 text-sm"
        />
      )}
      <div className="flex flex-col gap-2">
        {groupEntriesByDescription(dayEntries).map((group) =>
          group.length > 1 ? (
            <TimeEntryGroup key={group[0].id} entries={group} onUpdate={onUpdate} onDelete={onDelete} />
          ) : (
            <TimeEntryRow key={group[0].id} entry={group[0]} onUpdate={onUpdate} onDelete={onDelete} />
          )
        )}
      </div>
    </div>
  )
}
