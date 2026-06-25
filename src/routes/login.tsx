import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Clock, Moon, Sun } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate({ to: "/" })
    }
  }, [user, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <CardTitle>Sign in</CardTitle>
          </div>
          <CardDescription>Sign in with your Google account to start tracking time</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signIn} disabled={loading} className="w-full">
            {loading ? "Loading..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
