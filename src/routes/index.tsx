import { createFileRoute, Link } from "@tanstack/react-router"
import { BarChart3, Clock, FileText, LogOut, Moon, Sun, Timer as TimerIcon } from "lucide-react"

import { Timer } from "@/components/timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const { user, loading, signIn, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (user) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Clock className="size-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Timely - time tracker app</h1>
          <p className="max-w-md text-muted-foreground">
            Timely is a simple time tracking application that helps freelancers and professionals log work hours, manage
            tasks, and generate reports. Track your time with a one-click timer, set hourly rates, and export detailed
            reports as PDF.
          </p>
        </div>

        <div className="grid w-full max-w-lg gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
            <TimerIcon className="size-6 text-primary" />
            <h3 className="font-medium text-sm">Track time</h3>
            <p className="text-xs text-muted-foreground">Start and stop a timer to log your work hours accurately</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
            <BarChart3 className="size-6 text-primary" />
            <h3 className="font-medium text-sm">Set rates</h3>
            <p className="text-xs text-muted-foreground">Configure hourly rates to calculate earnings automatically</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
            <FileText className="size-6 text-primary" />
            <h3 className="font-medium text-sm">Export reports</h3>
            <p className="text-xs text-muted-foreground">Generate and download PDF reports of your tracked time</p>
          </div>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col gap-3">
            <CardTitle>Get started</CardTitle>
            <CardDescription>Sign in with your Google account to start tracking your time.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={signIn} disabled={loading} className="w-full">
              Sign in with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
