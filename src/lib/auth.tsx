import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { clearCalendarCache, getOrCreateCalendar } from "./google-calendar"

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const TOKEN_KEY = "timetracker_access_token"

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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  calendarId: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
})

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  const handleToken = useCallback(async (accessToken: string) => {
    setToken(accessToken)
    localStorage.setItem(TOKEN_KEY, accessToken)
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
      setToken(null)
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useGoogleLogin({
    onSuccess: (response) => handleToken(response.access_token),
    onError: () => setLoading(false),
    scope: "https://www.googleapis.com/auth/calendar",
  })

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      handleToken(saved)
    } else {
      setLoading(false)
    }
  }, [handleToken])

  const signIn = useCallback(() => {
    setLoading(true)
    login()
  }, [login])

  const signOut = useCallback(() => {
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }).catch(() => {})
    }
    setUser(null)
    setToken(null)
    setCalendarId(null)
    localStorage.removeItem(TOKEN_KEY)
    clearCalendarCache()
  }, [token])

  return <AuthContext value={{ user, token, calendarId, loading, signIn, signOut }}>{children}</AuthContext>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </GoogleOAuthProvider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
