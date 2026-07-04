import crypto from 'crypto'

const PREFIX = 'enc:v1:'
const IV_BYTES = 12

function getEncryptionKey(): Buffer | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim()
  if (!raw) return null

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length === 32) return decoded

  throw new Error(
    'SECRETS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64-encoded 32 bytes)',
  )
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRETS_ENCRYPTION_KEY is required in production')
    }
    return plaintext
  }

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored
  }

  const key = getEncryptionKey()
  if (!key) {
    throw new Error('SECRETS_ENCRYPTION_KEY is required to decrypt stored secrets')
  }

  const payload = stored.slice(PREFIX.length)
  const [ivPart, dataPart, tagPart] = payload.split('.')
  if (!ivPart || !dataPart || !tagPart) {
    throw new Error('Invalid encrypted secret format')
  }

  const iv = Buffer.from(ivPart, 'base64url')
  const data = Buffer.from(dataPart, 'base64url')
  const tag = Buffer.from(tagPart, 'base64url')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
