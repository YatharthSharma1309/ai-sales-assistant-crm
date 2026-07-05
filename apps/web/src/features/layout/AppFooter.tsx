const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.0.0'

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 px-6 py-4 text-center text-xs text-slate-500 backdrop-blur sm:text-left">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p>© {new Date().getFullYear()} AI Sales Assistant CRM</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="/help" className="transition-colors hover:text-brand-600">
            Help
          </a>
          <a href="/privacy" className="transition-colors hover:text-brand-600">
            Privacy
          </a>
          <a href="/terms" className="transition-colors hover:text-brand-600">
            Terms
          </a>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-400">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  )
}
