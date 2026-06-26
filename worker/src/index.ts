interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ALLOWED_ORIGINS: string
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

function getAllowedOrigin(env: Env, request: Request): string | null {
  const origin = request.headers.get("Origin") || ""
  if (env.ALLOWED_ORIGINS === "*") return "*"
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  return allowed.includes(origin) ? origin : null
}

function cors(env: Env, request: Request): HeadersInit {
  const origin = getAllowedOrigin(env, request)
  if (!origin) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  }
}

function json(env: Env, request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(env, request), "Content-Type": "application/json" },
  })
}

async function googleToken(env: Env, params: Record<string, string>) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params,
    }),
  })
  const data = await res.json()
  if (!res.ok) return { data, ok: false as const }
  return { data, ok: true as const }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env, request) })
    }

    const url = new URL(request.url)

    if (request.method !== "POST") {
      return json(env, request, { error: "Method not allowed" }, 405)
    }

    if (url.pathname === "/auth/token") {
      const { code, redirect_uri } = await request.json<{ code: string; redirect_uri: string }>()
      if (!code || !redirect_uri) return json(env, request, { error: "Missing code or redirect_uri" }, 400)

      const { data, ok } = await googleToken(env, {
        code,
        redirect_uri,
        grant_type: "authorization_code",
      })

      return json(env, request, data, ok ? 200 : 400)
    }

    if (url.pathname === "/auth/refresh") {
      const { refresh_token } = await request.json<{ refresh_token: string }>()
      if (!refresh_token) return json(env, request, { error: "Missing refresh_token" }, 400)

      const { data, ok } = await googleToken(env, {
        refresh_token,
        grant_type: "refresh_token",
      })

      return json(env, request, data, ok ? 200 : 400)
    }

    return json(env, request, { error: "Not found" }, 404)
  },
}
