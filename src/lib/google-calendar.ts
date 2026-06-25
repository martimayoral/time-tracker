const BASE = "https://www.googleapis.com/calendar/v3"
const CALENDAR_NAME = "Time Tracker"
const CALENDAR_ID_KEY = "timetracker_calendar_id"

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

async function request(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(token), ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Calendar API ${res.status}: ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getOrCreateCalendar(token: string): Promise<string> {
  const cached = localStorage.getItem(CALENDAR_ID_KEY)
  if (cached) {
    try {
      await request(token, `/calendars/${encodeURIComponent(cached)}`)
      return cached
    } catch {
      localStorage.removeItem(CALENDAR_ID_KEY)
    }
  }

  const list = await request(token, "/users/me/calendarList")
  const existing = list.items?.find((c: { summary: string }) => c.summary === CALENDAR_NAME)
  if (existing) {
    localStorage.setItem(CALENDAR_ID_KEY, existing.id)
    return existing.id
  }

  const created = await request(token, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: CALENDAR_NAME }),
  })
  localStorage.setItem(CALENDAR_ID_KEY, created.id)
  return created.id
}

export function clearCalendarCache() {
  localStorage.removeItem(CALENDAR_ID_KEY)
}

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  created: string
  extendedProperties?: {
    private?: Record<string, string>
  }
}

export interface TimeEntry {
  id: string
  user_id: string
  description: string
  start_time: string
  end_time: string | null
  hourly_rate: number
  created_at: string
}

function eventToEntry(event: CalendarEvent): TimeEntry {
  const isRunning = event.extendedProperties?.private?.running === "true"
  return {
    id: event.id,
    user_id: "",
    description: event.summary || "",
    start_time: event.start.dateTime,
    end_time: isRunning ? null : event.end.dateTime,
    hourly_rate: parseFloat(event.extendedProperties?.private?.hourlyRate || "0"),
    created_at: event.created,
  }
}

function entryToEventBody(entry: {
  description: string
  start_time: string
  end_time?: string
  hourly_rate?: number
  running?: boolean
}) {
  const isRunning = !entry.end_time
  const endTime = entry.end_time || new Date(new Date(entry.start_time).getTime() + 60000).toISOString()

  return {
    summary: entry.description,
    start: { dateTime: entry.start_time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    extendedProperties: {
      private: {
        hourlyRate: String(entry.hourly_rate ?? 0),
        ...(isRunning ? { running: "true" } : {}),
      },
    },
  }
}

export async function getTimeEntries(token: string, calendarId: string): Promise<TimeEntry[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  })
  const data = await request(token, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`)
  const entries = (data.items || []).filter((e: CalendarEvent) => e.start?.dateTime).map(eventToEntry)
  entries.reverse()
  return entries
}

export async function createTimeEntry(
  token: string,
  calendarId: string,
  entry: {
    description: string
    start_time: string
    end_time?: string
    hourly_rate?: number
  }
): Promise<TimeEntry> {
  const body = entryToEventBody(entry)
  const event = await request(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return eventToEntry(event)
}

export async function updateTimeEntry(
  token: string,
  calendarId: string,
  id: string,
  updates: Partial<Pick<TimeEntry, "description" | "start_time" | "end_time" | "hourly_rate">>
): Promise<TimeEntry> {
  const existing = await request(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`)

  const merged = {
    description: updates.description ?? existing.summary ?? "",
    start_time: updates.start_time ?? existing.start.dateTime,
    end_time:
      updates.end_time ??
      (existing.extendedProperties?.private?.running === "true" ? undefined : existing.end.dateTime),
    hourly_rate: updates.hourly_rate ?? parseFloat(existing.extendedProperties?.private?.hourlyRate || "0"),
  }

  if (updates.end_time) {
    ;(merged as { running?: boolean }).running = false
  }

  const body = entryToEventBody(merged)
  if (updates.end_time) {
    body.extendedProperties.private = {
      hourlyRate: body.extendedProperties.private.hourlyRate,
    }
  }

  const event = await request(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  return eventToEntry(event)
}

export async function deleteTimeEntry(token: string, calendarId: string, id: string): Promise<void> {
  await request(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
