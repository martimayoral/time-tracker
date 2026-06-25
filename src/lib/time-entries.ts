import { supabase } from "./supabase"

export interface TimeEntry {
  id: string
  user_id: string
  description: string
  start_time: string
  end_time: string | null
  hourly_rate: number
  created_at: string
}

export async function getTimeEntries() {
  const { data, error } = await supabase.from("time_entries").select("*").order("start_time", { ascending: false })

  if (error) throw error
  return data as TimeEntry[]
}

export async function createTimeEntry(entry: {
  description: string
  start_time: string
  end_time?: string
  hourly_rate?: number
}) {
  const { data, error } = await supabase.from("time_entries").insert(entry).select().single()

  if (error) throw error
  return data as TimeEntry
}

export async function updateTimeEntry(
  id: string,
  updates: Partial<Pick<TimeEntry, "description" | "start_time" | "end_time" | "hourly_rate">>
) {
  const { data, error } = await supabase.from("time_entries").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data as TimeEntry
}

export async function deleteTimeEntry(id: string) {
  const { error } = await supabase.from("time_entries").delete().eq("id", id)
  if (error) throw error
}

export function formatDuration(startTime: string, endTime: string | null): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function formatDurationEditable(startTime: string, endTime: string | null): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  return `${hours}:${String(minutes).padStart(2, "0")}`
}

export function parseDurationToMs(duration: string): number | null {
  const trimmed = duration.trim()
  if (!trimmed || !/^\d+:?\d*$/.test(trimmed)) return null

  let hours: number
  let minutes: number

  if (trimmed.includes(":")) {
    const [h, m] = trimmed.split(":")
    hours = parseInt(h || "0", 10)
    minutes = parseInt(m || "0", 10)
  } else if (trimmed.length <= 2) {
    hours = 0
    minutes = parseInt(trimmed, 10)
  } else {
    minutes = parseInt(trimmed.slice(-2), 10)
    hours = parseInt(trimmed.slice(0, -2), 10)
  }

  hours += Math.floor(minutes / 60)
  minutes = minutes % 60

  return (hours * 60 + minutes) * 60000
}

export function parseTimeOfDay(input: string): { hours: number; minutes: number } | null {
  const trimmed = input.trim()
  if (!trimmed || !/^\d+:?\d*$/.test(trimmed)) return null

  let hours: number
  let minutes: number

  if (trimmed.includes(":")) {
    const [h, m] = trimmed.split(":")
    hours = parseInt(h || "0", 10)
    minutes = parseInt(m || "0", 10)
  } else if (trimmed.length <= 2) {
    hours = parseInt(trimmed, 10)
    minutes = 0
  } else {
    minutes = parseInt(trimmed.slice(-2), 10)
    hours = parseInt(trimmed.slice(0, -2), 10)
  }

  hours += Math.floor(minutes / 60)
  minutes = minutes % 60
  if (hours > 23) return null

  return { hours, minutes }
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function groupEntriesByDay(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const groups = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const day = new Date(entry.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const existing = groups.get(day) ?? []
    existing.push(entry)
    groups.set(day, existing)
  }
  return groups
}

export function totalMsForDay(entries: TimeEntry[]): number {
  let totalMs = 0
  for (const entry of entries) {
    const start = new Date(entry.start_time)
    const end = entry.end_time ? new Date(entry.end_time) : new Date()
    totalMs += end.getTime() - start.getTime()
  }
  return totalMs
}

export function totalEarningsForDay(entries: TimeEntry[]): number {
  let total = 0
  for (const entry of entries) {
    const start = new Date(entry.start_time)
    const end = entry.end_time ? new Date(entry.end_time) : new Date()
    const hours = (end.getTime() - start.getTime()) / 3600000
    total += hours * (entry.hourly_rate || 0)
  }
  return total
}

export function totalDurationForDay(entries: TimeEntry[]): string {
  const totalMs = totalMsForDay(entries)
  const hours = Math.floor(totalMs / 3600000)
  const minutes = Math.floor((totalMs % 3600000) / 60000)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}
