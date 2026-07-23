import { TimeEntryGroup } from "@/components/time-entry-group"
import { TimeEntryRow } from "@/components/time-entry-row"
import {
  groupEntriesByDescription,
  type TimeEntry,
  totalDurationForDay,
  totalEarningsForDay,
  type updateTimeEntry,
} from "@/lib/time-entries"

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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{day}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Total: {totalDurationForDay(dayEntries)}</span>
          {totalEarningsForDay(dayEntries) > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {totalEarningsForDay(dayEntries).toFixed(2)} €
            </span>
          )}
        </div>
      </div>
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
