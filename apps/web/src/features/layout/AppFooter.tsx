const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.0.0'

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-500 sm:text-left">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p>© {new Date().getFullYear()} AI Sales Assistant CRM</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href="https://github.com"
            className="hover:text-slate-700"
            target="_blank"
            rel="noreferrer"
          >
            Help
          </a>
          <a href="#" className="hover:text-slate-700">
            Privacy
          </a>
          <a href="#" className="hover:text-slate-700">
            Terms
          </a>
          <span className="text-slate-400">v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  )
}
