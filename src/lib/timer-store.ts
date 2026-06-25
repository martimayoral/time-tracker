import { create } from "zustand"

import { checkPresetMatch, getPresetRange, PRESETS } from "@/components/ui/date-range-picker"

const TIMEFRAME_KEY = "timeframe-preset"

interface DateRange {
  from: Date
  to: Date
}

function getDefaultDateRange(): DateRange {
  const saved = localStorage.getItem(TIMEFRAME_KEY)
  if (saved && PRESETS.some((p) => p.name === saved)) {
    const range = getPresetRange(saved)
    return { from: range.from, to: range.to ?? range.from }
  }
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
  from.setHours(0, 0, 0, 0)
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

interface TimerState {
  description: string
  hourlyRate: string
  elapsed: string
  activeStartTime: string
  dateRange: DateRange
  setDescription: (v: string) => void
  setHourlyRate: (v: string) => void
  setElapsed: (v: string) => void
  setActiveStartTime: (v: string) => void
  setDateRange: (v: DateRange) => void
}

export const useTimerStore = create<TimerState>((set) => ({
  description: "",
  hourlyRate: "",
  elapsed: "",
  activeStartTime: "",
  dateRange: getDefaultDateRange(),
  setDescription: (description) => set({ description }),
  setHourlyRate: (hourlyRate) => set({ hourlyRate }),
  setElapsed: (elapsed) => set({ elapsed }),
  setActiveStartTime: (activeStartTime) => set({ activeStartTime }),
  setDateRange: (dateRange) => {
    const preset = checkPresetMatch({ from: dateRange.from, to: dateRange.to })
    if (preset) {
      localStorage.setItem(TIMEFRAME_KEY, preset)
    } else {
      localStorage.removeItem(TIMEFRAME_KEY)
    }
    set({ dateRange })
  },
}))
