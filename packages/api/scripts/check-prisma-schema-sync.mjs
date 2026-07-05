import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqlite = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
const postgres = readFileSync(join(root, 'prisma/schema.postgresql.prisma'), 'utf8')

function normalize(schema) {
  return schema
    .replace(/datasource db \{[\s\S]*?\}/m, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

const a = normalize(sqlite)
const b = normalize(postgres)

if (a !== b) {
  console.error('Prisma schemas are out of sync.')
  console.error('Compare packages/api/prisma/schema.prisma and schema.postgresql.prisma')
  process.exit(1)
}

console.log('Prisma schemas are in sync.')
