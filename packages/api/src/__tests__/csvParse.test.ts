import { describe, expect, it } from 'vitest'
import { parseCsvRows, stripBom } from '../lib/csvParse.js'

describe('csvParse', () => {
  it('strips UTF-8 BOM', () => {
    expect(stripBom('\ufeffFirst Name,Last Name')).toBe('First Name,Last Name')
  })

  it('parses quoted commas', () => {
    const { headers, rows } = parseCsvRows(
      'first name,company\nJane,"Acme, Inc"\n',
    )
    expect(headers).toEqual(['first name', 'company'])
    expect(rows[0]).toEqual(['Jane', 'Acme, Inc'])
  })

  it('skips empty rows', () => {
    const { rows } = parseCsvRows('name\nAlice\n,,,\nBob\n')
    expect(rows).toHaveLength(2)
    expect(rows[0][0]).toBe('Alice')
    expect(rows[1][0]).toBe('Bob')
  })
})
