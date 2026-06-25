import { useEffect, useRef, useState } from "react"

interface DateInputProps {
  value?: Date
  onChange: (date: Date) => void
}

interface DateParts {
  day: number
  month: number
  year: number
}

function DateInput({ value, onChange }: DateInputProps) {
  const [date, setDate] = useState<DateParts>(() => {
    const d = value ? new Date(value) : new Date()
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() }
  })

  const monthRef = useRef<HTMLInputElement | null>(null)
  const dayRef = useRef<HTMLInputElement | null>(null)
  const yearRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const d = value ? new Date(value) : new Date()
    setDate({ day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() })
  }, [value])

  const validateDate = (field: keyof DateParts, val: number): boolean => {
    if (
      (field === "day" && (val < 1 || val > 31)) ||
      (field === "month" && (val < 1 || val > 12)) ||
      (field === "year" && (val < 1000 || val > 9999))
    )
      return false
    const newDate = { ...date, [field]: val }
    const d = new Date(newDate.year, newDate.month - 1, newDate.day)
    return d.getFullYear() === newDate.year && d.getMonth() + 1 === newDate.month && d.getDate() === newDate.day
  }

  const handleInputChange = (field: keyof DateParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value ? Number(e.target.value) : ""
    const isValid = typeof newValue === "number" && validateDate(field, newValue)
    const newDate = { ...date, [field]: newValue }
    setDate(newDate as DateParts)
    if (isValid) onChange(new Date(newDate.year as number, (newDate.month as number) - 1, newDate.day as number))
  }

  const initialDate = useRef<DateParts>(date)

  const handleBlur = (field: keyof DateParts) => () => {
    const newValue = date[field]
    if (!newValue) {
      setDate(initialDate.current)
      return
    }
    if (!validateDate(field, Number(newValue))) {
      setDate(initialDate.current)
    } else {
      initialDate.current = { ...date, [field]: Number(newValue) }
    }
  }

  const handleKeyDown = (field: keyof DateParts) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.metaKey || e.ctrlKey) return
    if (
      !/^[0-9]$/.test(e.key) &&
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Delete", "Tab", "Backspace", "Enter"].includes(e.key)
    ) {
      e.preventDefault()
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const newDate = { ...date }
      if (field === "day") {
        if (date.day === new Date(date.year, date.month, 0).getDate()) {
          newDate.day = 1
          newDate.month = (date.month % 12) + 1
          if (newDate.month === 1) newDate.year += 1
        } else newDate.day += 1
      }
      if (field === "month") {
        if (date.month === 12) {
          newDate.month = 1
          newDate.year += 1
        } else newDate.month += 1
      }
      if (field === "year") newDate.year += 1
      setDate(newDate)
      onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const newDate = { ...date }
      if (field === "day") {
        if (date.day === 1) {
          newDate.month -= 1
          if (newDate.month === 0) {
            newDate.month = 12
            newDate.year -= 1
          }
          newDate.day = new Date(newDate.year, newDate.month, 0).getDate()
        } else newDate.day -= 1
      }
      if (field === "month") {
        if (date.month === 1) {
          newDate.month = 12
          newDate.year -= 1
        } else newDate.month -= 1
      }
      if (field === "year") newDate.year -= 1
      setDate(newDate)
      onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
    }
    if (e.key === "ArrowRight") {
      if (
        e.currentTarget.selectionStart === e.currentTarget.value.length ||
        (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === e.currentTarget.value.length)
      ) {
        e.preventDefault()
        if (field === "month") dayRef.current?.focus()
        if (field === "day") yearRef.current?.focus()
      }
    } else if (e.key === "ArrowLeft") {
      if (
        e.currentTarget.selectionStart === 0 ||
        (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === e.currentTarget.value.length)
      ) {
        e.preventDefault()
        if (field === "day") monthRef.current?.focus()
        if (field === "year") dayRef.current?.focus()
      }
    }
  }

  return (
    <div className="flex items-center rounded-lg border px-1 text-sm">
      <input
        type="text"
        ref={monthRef}
        maxLength={2}
        value={date.month.toString()}
        onChange={handleInputChange("month")}
        onKeyDown={handleKeyDown("month")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) e.target.select()
        }}
        onBlur={handleBlur("month")}
        className="w-6 border-none bg-transparent p-0 text-center outline-none"
        placeholder="M"
      />
      <span className="-mx-px opacity-20">/</span>
      <input
        type="text"
        ref={dayRef}
        maxLength={2}
        value={date.day.toString()}
        onChange={handleInputChange("day")}
        onKeyDown={handleKeyDown("day")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) e.target.select()
        }}
        onBlur={handleBlur("day")}
        className="w-7 border-none bg-transparent p-0 text-center outline-none"
        placeholder="D"
      />
      <span className="-mx-px opacity-20">/</span>
      <input
        type="text"
        ref={yearRef}
        maxLength={4}
        value={date.year.toString()}
        onChange={handleInputChange("year")}
        onKeyDown={handleKeyDown("year")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) e.target.select()
        }}
        onBlur={handleBlur("year")}
        className="w-12 border-none bg-transparent p-0 text-center outline-none"
        placeholder="YYYY"
      />
    </div>
  )
}

export { DateInput }
