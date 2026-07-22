import { useEffect, useState } from "react"

const STORAGE_KEY = "timely_advanced_mode"
const UNLOCK_CODE = "timelyplus"

export function useAdvancedMode() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === "true")

  useEffect(() => {
    if (enabled) return
    let buffer = ""
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return
      buffer = (buffer + e.key.toLowerCase()).slice(-UNLOCK_CODE.length)
      if (buffer === UNLOCK_CODE) {
        localStorage.setItem(STORAGE_KEY, "true")
        setEnabled(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled])

  return enabled
}
