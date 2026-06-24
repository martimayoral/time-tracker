import { createRootRoute, Outlet } from "@tanstack/react-router"
import { AuthProvider } from "@/lib/auth"
import { ThemeProvider } from "@/lib/theme"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  )
}
