export type CsvLeadRow = {
  title: string
  source?: string
  status?: string
  notes?: string
}

export function parseLeadsCsv(text: string): CsvLeadRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const titleIdx = headers.indexOf('title')
  if (titleIdx === -1) {
    throw new Error('CSV must include a "title" column')
  }

  const sourceIdx = headers.indexOf('source')
  const statusIdx = headers.indexOf('status')
  const notesIdx = headers.indexOf('notes')

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    const row: CsvLeadRow = { title: cols[titleIdx] ?? '' }
    if (!row.title) throw new Error('Each row needs a title')

    if (sourceIdx >= 0 && cols[sourceIdx]) row.source = cols[sourceIdx]
    if (statusIdx >= 0 && cols[statusIdx]) row.status = cols[statusIdx].toUpperCase()
    if (notesIdx >= 0 && cols[notesIdx]) row.notes = cols[notesIdx]

    return row
  })
}
