import type { Session, User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "./supabase"

interface AuthContext {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext value={{ user: session?.user ?? null, session, loading }}>{children}</AuthContext>
}

export function useAuth() {
  return useContext(AuthContext)
}
