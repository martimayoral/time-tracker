import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { type FC, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateInput } from "@/components/ui/date-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface DateRangePickerProps {
  onUpdate?: (values: { range: DateRange }) => void
  initialDateFrom?: Date | string
  initialDateTo?: Date | string
  align?: "start" | "center" | "end"
  locale?: string
}

interface DateRange {
  from: Date
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
}

export const PRESETS: Preset[] = [
  { name: "today", label: "Today" },
  { name: "yesterday", label: "Yesterday" },
  { name: "last7", label: "Last 7 days" },
  { name: "last14", label: "Last 14 days" },
  { name: "last30", label: "Last 30 days" },
  { name: "thisWeek", label: "This Week" },
  { name: "lastWeek", label: "Last Week" },
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
]

const formatDate = (date: Date, locale = "en-us"): string =>
  date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map((p) => parseInt(p, 10))
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return dateInput
}

export function getPresetRange(presetName: string): DateRange {
  const from = new Date()
  const to = new Date()
  const first = from.getDate() - from.getDay()

  switch (presetName) {
    case "today":
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "yesterday":
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      to.setDate(to.getDate() - 1)
      to.setHours(23, 59, 59, 999)
      break
    case "last7":
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "last14":
      from.setDate(from.getDate() - 13)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "last30":
      from.setDate(from.getDate() - 29)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "thisWeek":
      from.setDate(first)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "lastWeek":
      from.setDate(from.getDate() - 7 - from.getDay())
      to.setDate(to.getDate() - to.getDay() - 1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "thisMonth":
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "lastMonth":
      from.setMonth(from.getMonth() - 1)
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setDate(0)
      to.setHours(23, 59, 59, 999)
      break
  }
  return { from, to }
}

export function checkPresetMatch(range: DateRange): string | undefined {
  for (const preset of PRESETS) {
    const presetRange = getPresetRange(preset.name)
    const nFrom = new Date(range.from)
    nFrom.setHours(0, 0, 0, 0)
    const nPFrom = new Date(presetRange.from.setHours(0, 0, 0, 0))
    const nTo = new Date(range.to ?? 0)
    nTo.setHours(0, 0, 0, 0)
    const nPTo = new Date(presetRange.to?.setHours(0, 0, 0, 0) ?? 0)
    if (nFrom.getTime() === nPFrom.getTime() && nTo.getTime() === nPTo.getTime()) {
      return preset.name
    }
  }
  return undefined
}

export const DateRangePicker: FC<DateRangePickerProps> = ({
  initialDateFrom = new Date(new Date().setHours(0, 0, 0, 0)),
  initialDateTo,
  onUpdate,
  align = "end",
  locale = "en-US",
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom),
    to: initialDateTo ? getDateAdjustedForTimezone(initialDateTo) : getDateAdjustedForTimezone(initialDateFrom),
  })
  const openedRangeRef = useRef<DateRange | undefined>(undefined)
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)
  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== "undefined" ? window.innerWidth < 960 : false)

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 960)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const setPreset = (preset: string) => {
    setRange(getPresetRange(preset))
  }

  const resetValues = () => {
    setRange({
      from: typeof initialDateFrom === "string" ? getDateAdjustedForTimezone(initialDateFrom) : initialDateFrom,
      to: initialDateTo
        ? typeof initialDateTo === "string"
          ? getDateAdjustedForTimezone(initialDateTo)
          : initialDateTo
        : typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom,
    })
  }

  useEffect(() => {
    setSelectedPreset(checkPresetMatch(range))
  }, [range])

  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b
    return a.from.getTime() === b.from.getTime() && (!a.to || !b.to || a.to.getTime() === b.to.getTime())
  }

  return (
    <Popover
      modal
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          openedRangeRef.current = range
        } else {
          resetValues()
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button size="lg" variant="outline">
          <div className="py-1 text-right">
            {`${formatDate(range.from, locale)}${range.to != null ? ` - ${formatDate(range.to, locale)}` : ""}`}
          </div>
          <div className="-mr-2 scale-125 pl-1 opacity-60">
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto">
        <div className="flex py-2">
          <div className="flex flex-col">
            <div className="flex flex-col items-center justify-end gap-2 px-3 pb-4 lg:flex-row lg:items-start lg:pb-0">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <DateInput
                    value={range.from}
                    onChange={(date) => {
                      const toDate = range.to == null || date > range.to ? date : range.to
                      setRange((prev) => ({ ...prev, from: date, to: toDate }))
                    }}
                  />
                  <div className="py-1">-</div>
                  <DateInput
                    value={range.to}
                    onChange={(date) => {
                      const fromDate = date < range.from ? date : range.from
                      setRange((prev) => ({ ...prev, from: fromDate, to: date }))
                    }}
                  />
                </div>
              </div>
            </div>
            {isSmallScreen && (
              <Select defaultValue={selectedPreset} onValueChange={setPreset}>
                <SelectTrigger className="mx-auto mb-2 w-[180px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Calendar
              mode="range"
              onSelect={(value) => {
                if (value?.from != null) setRange({ from: value.from, to: value?.to })
              }}
              selected={range}
              numberOfMonths={isSmallScreen ? 1 : 2}
              defaultMonth={new Date(new Date().setMonth(new Date().getMonth() - (isSmallScreen ? 0 : 1)))}
            />
          </div>
          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-1 pb-6 pl-6 pr-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  className={cn(selectedPreset === preset.name && "pointer-events-none")}
                  variant="ghost"
                  onClick={() => setPreset(preset.name)}
                >
                  <span className={cn("pr-2 opacity-0", selectedPreset === preset.name && "opacity-70")}>
                    <Check className="size-4" />
                  </span>
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 py-2 pr-4">
          <Button
            onClick={() => {
              setIsOpen(false)
              resetValues()
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false)
              if (!areRangesEqual(range, openedRangeRef.current)) onUpdate?.({ range })
            }}
          >
            Update
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
