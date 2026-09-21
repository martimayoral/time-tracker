import { create } from "zustand"

const STORAGE_KEY = "timely_advanced_mode"
const UNLOCK_CODE = "timelyplus"

interface AdvancedModeState {
  enabled: boolean
  enable: () => void
}

const useAdvancedModeStore = create<AdvancedModeState>((set) => ({
  enabled: localStorage.getItem(STORAGE_KEY) === "true",
  enable: () => {
    localStorage.setItem(STORAGE_KEY, "true")
    set({ enabled: true })
  },
}))

// One listener for the whole app, however many components read the flag.
let buffer = ""
window.addEventListener("keydown", (e) => {
  if (useAdvancedModeStore.getState().enabled || e.key.length !== 1) return
  buffer = (buffer + e.key.toLowerCase()).slice(-UNLOCK_CODE.length)
  if (buffer === UNLOCK_CODE) useAdvancedModeStore.getState().enable()
})

export function useAdvancedMode() {
  return useAdvancedModeStore((s) => s.enabled)
}
