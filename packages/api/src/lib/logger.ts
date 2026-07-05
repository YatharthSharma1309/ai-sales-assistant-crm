import { randomUUID } from 'crypto'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

type LogFields = Record<string, unknown>

function write(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...fields,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
}

export function createRequestId(): string {
  return randomUUID()
}
