#!/usr/bin/env node
/**
 * Prints random values for Railway/Render production env vars.
 * Copy output into your hosting dashboard — never commit these values.
 */
import crypto from 'crypto'

const hex = (bytes) => crypto.randomBytes(bytes).toString('hex')

console.log('# Paste into Railway / Render (Variables tab). Do not commit.\n')
console.log(`JWT_SECRET=${hex(32)}`)
console.log(`SECRETS_ENCRYPTION_KEY=${hex(32)}`)
console.log(`INBOUND_EMAIL_WEBHOOK_SECRET=${hex(24)}`)
console.log(`CRON_SECRET=${hex(24)}`)
