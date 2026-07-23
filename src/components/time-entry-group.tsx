import { Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ghostInput, TimeEntryFields } from "@/components/time-entry-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  const focusedField = useRef<string | null>(null)

  useEffect(() => {
    if (focusedField.current !== "title") setTitle(firstEntry.description)
  }, [firstEntry.description])

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
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          <span className="text-sm font-semibold">{totalDurationForDay(entries)}</span>
          {totalEarningsForDay(entries) > 0 && (
            <span className="text-xs text-muted-foreground">{totalEarningsForDay(entries).toFixed(2)} €</span>
          )}
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
        </div>
      </CardContent>
    </Card>
  )
}
