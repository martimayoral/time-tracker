import type { ComponentProps } from "react"
import { useEffect, useRef } from "react"

import { Input } from "@/components/ui/input"
import { parseDurationToMs, parseTimeOfDay } from "@/lib/time-entries"

const STEP_MINUTES = 15
const MINUTES_PER_DAY = 24 * 60

type StepMode = "time-of-day" | "duration"

const toMinutes = (value: string, mode: StepMode) => {
  if (mode === "duration") {
    const ms = parseDurationToMs(value)
    return ms == null ? null : Math.round(ms / 60000)
  }
  const parsed = parseTimeOfDay(value)
  return parsed ? parsed.hours * 60 + parsed.minutes : null
}

const formatMinutes = (minutes: number, mode: StepMode) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const h = mode === "duration" ? String(hours) : String(hours).padStart(2, "0")
  return `${h}:${String(mins).padStart(2, "0")}`
}

/** Adds or subtracts 15 minutes from the current value, keeping any off-grid offset (10:10 → 10:25). */
const stepValue = (value: string, mode: StepMode, direction: 1 | -1) => {
  const current = toMinutes(value, mode)
  if (current == null) return null
  const stepped = current + direction * STEP_MINUTES
  if (mode === "duration") return formatMinutes(Math.max(0, stepped), mode)
  return formatMinutes(((stepped % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY, mode)
}

type TimeInputProps = Omit<
  ComponentProps<typeof Input>,
  "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "value" | "ref"
> & {
  value: string
  onValueChange: (value: string) => void
  onSave: () => void
  onCancel?: () => void
  /** How the value is read when stepping: a clock time that wraps at midnight, or a duration floored at zero. */
  mode?: StepMode
}

export function TimeInput({ value, onValueChange, onSave, onCancel, mode = "time-of-day", ...props }: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const stepRef = useRef<(direction: 1 | -1) => void>(() => {})

  const step = (direction: 1 | -1) => {
    const next = stepValue(value, mode, direction)
    if (next == null) return
    onValueChange(next)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  useEffect(() => {
    stepRef.current = step
  })

  // React attaches wheel listeners passively, so the listener is registered by hand to allow preventDefault.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement !== el || e.deltaY === 0) return
      e.preventDefault()
      stepRef.current(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [])

  return (
    <Input
      {...props}
      ref={inputRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={onSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          onCancel?.()
          e.currentTarget.blur()
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault()
          step(e.key === "ArrowUp" ? 1 : -1)
        }
      }}
    />
  )
}
