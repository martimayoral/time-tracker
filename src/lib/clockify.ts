import { create } from "zustand"

import type { TimeEntry } from "@/lib/time-entries"

const CONFIG_KEY = "timely_clockify_config"
const PUSHED_KEY = "timely_clockify_pushed"

export interface ClockifyConfig {
  workspaceId: string
  projectId: string
  token: string
}

const EMPTY_CONFIG: ClockifyConfig = { workspaceId: "", projectId: "", token: "" }

/** Prefilled into an empty settings field with ArrowLeft, so the usual setup is one keypress per field. */
export const CLOCKIFY_DEFAULTS: ClockifyConfig = {
  workspaceId: "66ebcb0bbd01ff686a97a1b7",
  projectId: "66eeb8c5893fbc32774b024d",
  token: "",
}

function loadConfig(): ClockifyConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return EMPTY_CONFIG
    const parsed = JSON.parse(raw)
    return {
      workspaceId: typeof parsed.workspaceId === "string" ? parsed.workspaceId : "",
      projectId: typeof parsed.projectId === "string" ? parsed.projectId : "",
      token: typeof parsed.token === "string" ? parsed.token : "",
    }
  } catch {
    return EMPTY_CONFIG
  }
}

/** Maps a local entry id to the Clockify time entry it was pushed as. */
function loadPushed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PUSHED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function isClockifyConfigured(config: ClockifyConfig): boolean {
  return !!config.workspaceId.trim() && !!config.projectId.trim() && !!config.token.trim()
}

/** Reads `exp` out of the session JWT without verifying it, to warn before a push fails. */
export function tokenExpiresAt(token: string): Date | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof json.exp === "number" ? new Date(json.exp * 1000) : null
  } catch {
    return null
  }
}

interface ClockifyState {
  config: ClockifyConfig
  pushed: Record<string, string>
  settingsOpen: boolean
  setConfig: (config: ClockifyConfig) => void
  setSettingsOpen: (open: boolean) => void
  markPushed: (entryId: string, clockifyId: string) => void
  clearPushed: () => void
}

export const useClockifyStore = create<ClockifyState>((set) => ({
  config: loadConfig(),
  pushed: loadPushed(),
  settingsOpen: false,
  setConfig: (config) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    set({ config })
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  markPushed: (entryId, clockifyId) =>
    set((state) => {
      const pushed = { ...state.pushed, [entryId]: clockifyId }
      localStorage.setItem(PUSHED_KEY, JSON.stringify(pushed))
      return { pushed }
    }),
  clearPushed: () => {
    localStorage.removeItem(PUSHED_KEY)
    set({ pushed: {} })
  },
}))

export class ClockifyError extends Error {
  readonly status: number
  readonly expiredToken: boolean

  constructor(message: string, status: number, expiredToken = false) {
    super(message)
    this.name = "ClockifyError"
    this.status = status
    this.expiredToken = expiredToken
  }
}

/**
 * Creates the entry in Clockify through the same endpoint the web app uses.
 * The session token it needs is short lived, so expiry is reported explicitly.
 */
export async function pushEntryToClockify(config: ClockifyConfig, entry: TimeEntry): Promise<string> {
  if (!isClockifyConfigured(config)) throw new ClockifyError("Clockify is not configured", 0)
  if (!entry.end_time) throw new ClockifyError("Entry is still running", 0)

  const res = await fetch(`https://app.clockify.me/api/workspaces/${config.workspaceId.trim()}/timeEntries/full`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "app-name": "WEB",
      "x-auth-token": config.token.trim(),
    },
    body: JSON.stringify({
      billable: true,
      description: entry.description,
      projectId: config.projectId.trim(),
      taskId: null,
      tagIds: null,
      customFields: [],
      start: new Date(entry.start_time).toISOString(),
      end: new Date(entry.end_time).toISOString(),
    }),
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const code = body?.code
    const expiredToken = res.status === 401 || code === 4017
    const message = expiredToken
      ? "Session token expired — paste a fresh one"
      : body?.message || `Clockify returned ${res.status}`
    throw new ClockifyError(message, res.status, expiredToken)
  }

  return body?.id ?? ""
}
