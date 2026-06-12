export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function parseCsvHeaders(line: string): string[] {
  return parseCsvLine(line).map((h) => h.trim().toLowerCase())
}

export function columnIndex(headers: string[], names: string[]): number {
  return names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1
}

export function parseCsvRows(text: string): { headers: string[]; rows: string[][] } {
  const normalized = stripBom(text.trim())
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvHeaders(lines[0])
  const rows = lines
    .slice(1)
    .map(parseCsvLine)
    .filter((cols) => cols.some((c) => c.length > 0))

  return { headers, rows }
}
