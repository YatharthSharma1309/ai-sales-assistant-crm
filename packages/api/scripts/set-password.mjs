import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node scripts/set-password.mjs <email> <password>')
  process.exit(1)
}

const prisma = new PrismaClient()
const passwordHash = await bcrypt.hash(password, 10)
await prisma.user.update({ where: { email }, data: { passwordHash } })
console.log(JSON.stringify({ ok: true, email }))
await prisma.$disconnect()
