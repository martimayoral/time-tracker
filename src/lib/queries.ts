import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "./auth"
import { createTimeEntry, deleteTimeEntry, getTimeEntries, type TimeEntry, updateTimeEntry } from "./time-entries"

function entriesKey(calendarId: string | null) {
  return ["timeEntries", calendarId] as const
}

function useRequiredAuth() {
  const { token, calendarId } = useAuth()
  return {
    token,
    calendarId,
    requireAuth() {
      if (!token || !calendarId) throw new Error("Not authenticated")
      return { token, calendarId }
    },
  }
}

export function useTimeEntries() {
  const { token, calendarId, requireAuth } = useRequiredAuth()
  return useQuery({
    queryKey: entriesKey(calendarId),
    queryFn: () => {
      const { token, calendarId } = requireAuth()
      return getTimeEntries(token, calendarId)
    },
    enabled: !!token && !!calendarId,
  })
}

export function useCreateEntry() {
  const { calendarId, requireAuth } = useRequiredAuth()
  const qc = useQueryClient()
  const key = entriesKey(calendarId)

  return useMutation({
    mutationFn: (entry: { description: string; start_time: string; hourly_rate?: number }) => {
      const { token, calendarId } = requireAuth()
      return createTimeEntry(token, calendarId, entry)
    },
    onMutate: async (newEntry) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)
      const optimistic: TimeEntry = {
        id: `temp-${Date.now()}`,
        user_id: "",
        description: newEntry.description,
        start_time: newEntry.start_time,
        end_time: null,
        hourly_rate: newEntry.hourly_rate ?? 0,
        created_at: newEntry.start_time,
      }
      qc.setQueryData<TimeEntry[]>(key, (old) => [optimistic, ...(old ?? [])])
      return { previous, optimisticId: optimistic.id }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (created, _vars, context) => {
      qc.setQueryData<TimeEntry[]>(
        key,
        (old) => old?.map((e) => (e.id === context?.optimisticId ? created : e)) ?? [created]
      )
    },
  })
}

export function useUpdateEntry() {
  const { calendarId, requireAuth } = useRequiredAuth()
  const qc = useQueryClient()
  const key = entriesKey(calendarId)

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<TimeEntry, "description" | "start_time" | "end_time" | "hourly_rate">>
    }) => {
      const { token, calendarId } = requireAuth()
      return updateTimeEntry(token, calendarId, id, updates)
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)
      qc.setQueryData<TimeEntry[]>(key, (old) => old?.map((e) => (e.id === id ? { ...e, ...updates } : e)))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (updated) => {
      qc.setQueryData<TimeEntry[]>(key, (old) => old?.map((e) => (e.id === updated.id ? updated : e)))
    },
  })
}

export function useDeleteEntry() {
  const { calendarId, requireAuth } = useRequiredAuth()
  const qc = useQueryClient()
  const key = entriesKey(calendarId)

  return useMutation({
    mutationFn: (id: string) => {
      const { token, calendarId } = requireAuth()
      return deleteTimeEntry(token, calendarId, id)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)
      qc.setQueryData<TimeEntry[]>(key, (old) => old?.filter((e) => e.id !== id))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
  })
}
