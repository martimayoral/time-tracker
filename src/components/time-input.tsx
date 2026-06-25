import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"

type TimeInputProps = Omit<ComponentProps<typeof Input>, "onChange" | "onFocus" | "onBlur" | "onKeyDown"> & {
  onValueChange: (value: string) => void
  onSave: () => void
}

export function TimeInput({ onValueChange, onSave, ...props }: TimeInputProps) {
  return (
    <Input
      {...props}
      onChange={(e) => onValueChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={onSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
      }}
    />
  )
}
