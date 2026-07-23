import { jsPDF } from "jspdf"

import {
  formatDuration,
  groupEntriesByDay,
  groupEntriesByDescription,
  type TimeEntry,
  totalDurationForDay,
  totalEarningsForDay,
  totalMsForDay,
} from "./time-entries"

const formatTimeValue = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function exportToPdf(entries: TimeEntry[], dateFrom: Date, dateTo: Date) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  function checkPageBreak(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
  }

  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Timely — Time Report", margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const fromStr = dateFrom.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  const toStr = dateTo.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  doc.text(`${fromStr}  —  ${toStr}`, margin, y)
  y += 12

  const grouped = groupEntriesByDay(entries)
  let grandTotalMs = 0
  let grandTotalEarnings = 0

  for (const [day, dayEntries] of grouped.entries()) {
    const dayMs = totalMsForDay(dayEntries)
    const dayEarnings = totalEarningsForDay(dayEntries)
    grandTotalMs += dayMs
    grandTotalEarnings += dayEarnings

    checkPageBreak(20 + dayEntries.length * 8)

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(day, margin, y)
    const daySummary = `${totalDurationForDay(dayEntries)}${dayEarnings > 0 ? `  •  ${dayEarnings.toFixed(2)} €` : ""}`
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(daySummary, pageWidth - margin, y, { align: "right" })
    y += 2

    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5

    doc.setFontSize(9)
    for (const group of groupEntriesByDescription(dayEntries)) {
      for (const entry of group) {
        checkPageBreak(10)

        const startStr = formatTimeValue(entry.start_time)
        const endStr = entry.end_time ? formatTimeValue(entry.end_time) : "running"
        const dur = formatDuration(entry.start_time, entry.end_time)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text(`${startStr} – ${endStr}`, margin, y)
        doc.text(entry.description, margin + 38, y)

        const rightParts: string[] = [dur]
        if (entry.hourly_rate > 0) {
          const hours =
            (new Date(entry.end_time || new Date()).getTime() - new Date(entry.start_time).getTime()) / 3600000
          rightParts.push(`${(hours * entry.hourly_rate).toFixed(2)} €`)
        }
        doc.text(rightParts.join("   "), pageWidth - margin, y, { align: "right" })
        y += 6
      }

      const noteText = group[0].notes.trim()
      if (noteText) {
        const noteX = margin + 38
        const noteMaxWidth = pageWidth - margin - noteX
        doc.setFont("helvetica", "italic")
        doc.setFontSize(8)
        const noteLines = doc.splitTextToSize(noteText, noteMaxWidth) as string[]
        checkPageBreak(noteLines.length * 4 + 2)
        doc.setTextColor(120, 120, 120)
        doc.text(noteLines, noteX, y)
        doc.setTextColor(0, 0, 0)
        y += noteLines.length * 4 + 2
      }
    }
    y += 6
  }

  checkPageBreak(20)
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Total", margin, y)

  const totalParts = [formatMs(grandTotalMs)]
  if (grandTotalEarnings > 0) {
    totalParts.push(`${grandTotalEarnings.toFixed(2)} €`)
  }
  doc.text(totalParts.join("   •   "), pageWidth - margin, y, { align: "right" })

  const fileName = `timely-report-${dateFrom.toISOString().slice(0, 10)}_${dateTo.toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
