import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Clock, LogOut, Moon, Sun } from "lucide-react"
import { useEffect } from "react"

import { Timer } from "@/components/timer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const { user, loading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!user) return null

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Timely - time tracker app</h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <Timer />
    </div>
  )
}
