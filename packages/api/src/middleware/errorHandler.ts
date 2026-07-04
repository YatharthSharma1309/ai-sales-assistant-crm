import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Not allowed by CORS' })
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }

  const status =
    typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500

  const message =
    process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : 'Internal server error'

  res.status(status).json({ error: message })
}
