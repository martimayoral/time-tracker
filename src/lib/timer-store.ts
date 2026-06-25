import { create } from "zustand"

interface DateRange {
  from: Date
  to: Date
}

function getDefaultDateRange(): DateRange {
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
  setDateRange: (dateRange) => set({ dateRange }),
}))
