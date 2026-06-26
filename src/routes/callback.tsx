import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth"

export const Route = createFileRoute("/callback")({
  component: Callback,
})

function Callback() {
  const { handleCallback } = useAuth()
  const navigate = useNavigate()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    if (code) {
      handleCallback(code).then(() => navigate({ to: "/" }))
    } else {
      navigate({ to: "/" })
    }
  }, [handleCallback, navigate])

  return <div className="flex min-h-screen items-center justify-center">Signing in...</div>
}
