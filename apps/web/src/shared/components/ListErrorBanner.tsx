type ListErrorBannerProps = {
  error: string | null
}

export function ListErrorBanner({ error }: ListErrorBannerProps) {
  if (!error) return null

  return (
    <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </p>
  )
}
