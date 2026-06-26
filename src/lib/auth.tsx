import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { clearCalendarCache, getOrCreateCalendar } from "./google-calendar"

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const authWorkerUrl = import.meta.env.VITE_AUTH_WORKER_URL as string

const ACCESS_TOKEN_KEY = "timetracker_access_token"
const REFRESH_TOKEN_KEY = "timetracker_refresh_token"
const EXPIRY_KEY = "timetracker_token_expiry"
const REFRESH_MARGIN_MS = 5 * 60 * 1000

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const SCOPES = "openid email profile https://www.googleapis.com/auth/calendar"

function getRedirectUri() {
  return `${window.location.origin}/callback`
}

interface GoogleUser {
  email: string
  name: string
  picture: string
}

interface AuthContextValue {
  user: GoogleUser | null
  token: string | null
  calendarId: string | null
  loading: boolean
  signIn: () => void
  signOut: () => void
  handleCallback: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  calendarId: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
  handleCallback: async () => {},
})

async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch(`${authWorkerUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })
  if (!res.ok) throw new Error("Token exchange failed")
  return res.json()
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${authWorkerUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error("Token refresh failed")
  return res.json()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    setCalendarId(null)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    clearCalendarCache()
  }, [])

  const setupUser = useCallback(
    async (accessToken: string) => {
      setToken(accessToken)
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) throw new Error("Failed to fetch user info")
        const info = await res.json()
        setUser({ email: info.email, name: info.name, picture: info.picture })
        const calId = await getOrCreateCalendar(accessToken)
        setCalendarId(calId)
      } catch {
        clearAuth()
      } finally {
        setLoading(false)
      }
    },
    [clearAuth]
  )

  const setupUserRef = useRef(setupUser)
  setupUserRef.current = setupUser
  const clearAuthRef = useRef(clearAuth)
  clearAuthRef.current = clearAuth

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000))
    const delay = Math.max(0, expiresInSeconds * 1000 - REFRESH_MARGIN_MS)
    refreshTimerRef.current = setTimeout(async () => {
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!rt) return
      try {
        const data = await refreshAccessToken(rt)
        setupUserRef.current(data.access_token)
        scheduleRefreshRef.current(data.expires_in)
      } catch {
        clearAuthRef.current()
      }
    }, delay)
  }, [])

  const scheduleRefreshRef = useRef(scheduleRefresh)
  scheduleRefreshRef.current = scheduleRefresh

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      setLoading(false)
      return
    }

    const expiresAt = parseInt(localStorage.getItem(EXPIRY_KEY) || "0", 10)
    const remainingMs = expiresAt - Date.now()
    const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY)

    if (savedToken && remainingMs > REFRESH_MARGIN_MS) {
      setupUser(savedToken)
      scheduleRefresh(Math.floor(remainingMs / 1000))
    } else {
      refreshAccessToken(refreshToken)
        .then((data) => {
          setupUserRef.current(data.access_token)
          scheduleRefreshRef.current(data.expires_in)
        })
        .catch(() => {
          clearAuth()
          setLoading(false)
        })
    }
  }, [setupUser, scheduleRefresh, clearAuth])

  const signIn = useCallback(() => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
    })
    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
  }, [])

  const handleCallback = useCallback(
    async (code: string) => {
      setLoading(true)
      try {
        const data = await exchangeCode(code, getRedirectUri())
        if (data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
        }
        await setupUser(data.access_token)
        scheduleRefresh(data.expires_in)
      } catch {
        clearAuth()
        setLoading(false)
      }
    },
    [setupUser, scheduleRefresh, clearAuth]
  )

  const signOut = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }).catch(() => {})
    }
    clearAuth()
  }, [token, clearAuth])

  return (
    <AuthContext value={{ user, token, calendarId, loading, signIn, signOut, handleCallback }}>{children}</AuthContext>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
