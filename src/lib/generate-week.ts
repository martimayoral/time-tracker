const randInRange = (min: number, max: number) => min + Math.random() * (max - min)

const toIso = (day: Date, minutes: number) => {
  const d = new Date(day)
  d.setHours(Math.floor(minutes / 60), Math.round(minutes % 60), 0, 0)
  return d.toISOString()
}

export function getWeekdaysForWeek(reference: Date): Date[] {
  const monday = new Date(reference)
  monday.setDate(reference.getDate() - reference.getDay() + 1)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function generateDaySchedule(day: Date): { start_time: string; end_time: string }[] {
  const total = randInRange(450, 510)
  const morningDur = randInRange(Math.max(180, total - 300), Math.min(300, total - 180))
  const afternoonDur = total - morningDur

  const upperS2 = Math.min(900, 1140 - afternoonDur)
  const e1Max = Math.min(840, upperS2 - 30)

  const s1 = randInRange(Math.max(540, 780 - morningDur), Math.min(600, e1Max - morningDur))
  const e1 = s1 + morningDur

  const s2 = randInRange(Math.max(840, e1 + 30, 1080 - afternoonDur), upperS2)
  const e2 = s2 + afternoonDur

  return [
    { start_time: toIso(day, s1), end_time: toIso(day, e1) },
    { start_time: toIso(day, s2), end_time: toIso(day, e2) },
  ]
}
