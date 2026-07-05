import type { SVGProps } from 'react'

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  /** When true, paths render white for use on gradient backgrounds */
  inverted?: boolean
}

/** Pipeline bars + growth arc — the core brand mark */
export function LogoMark({ inverted = false, className, ...props }: LogoMarkProps) {
  const bar = inverted ? '#ffffff' : 'currentColor'
  const arc = inverted ? 'rgba(255,255,255,0.85)' : 'currentColor'

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <rect x="5" y="18" width="4.5" height="9" rx="1.5" fill={bar} opacity={inverted ? 0.55 : 0.35} />
      <rect x="11.25" y="14" width="4.5" height="13" rx="1.5" fill={bar} opacity={inverted ? 0.75 : 0.55} />
      <rect x="17.5" y="9" width="4.5" height="18" rx="1.5" fill={bar} opacity={inverted ? 0.9 : 0.75} />
      <rect x="23.75" y="5" width="4.5" height="22" rx="1.5" fill={bar} />
      <path
        d="M7.25 17.5C11 15 15.5 11.5 20 9.5C22.5 8.25 25 6.75 27.5 5"
        stroke={arc}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={inverted ? 0.9 : 0.85}
      />
      <circle cx="27.5" cy="5" r="2" fill={bar} />
    </svg>
  )
}

type AppLogoProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  /** default = gradient tile; onDark = for dark sidebar; plain = icon only */
  variant?: 'default' | 'onDark' | 'plain'
  title?: string
  subtitle?: string
  className?: string
}

const boxSizes = {
  xs: 'h-8 w-8 rounded-lg',
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
} as const

const iconSizes = {
  xs: 'h-4 w-4',
  sm: 'h-[18px] w-[18px]',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

export function AppLogo({
  size = 'md',
  showWordmark = false,
  variant = 'default',
  title = 'AI Sales CRM',
  subtitle,
  className = '',
}: AppLogoProps) {
  const icon = (
    <LogoMark
      inverted={variant !== 'plain'}
      className={
        variant === 'plain'
          ? `text-brand-600 ${iconSizes[size]}`
          : iconSizes[size]
      }
    />
  )

  const tile =
    variant === 'plain' ? (
      <span className={`inline-flex shrink-0 items-center justify-center ${boxSizes[size]}`}>
        {icon}
      </span>
    ) : variant === 'onDark' ? (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-900/40 ${boxSizes[size]}`}
      >
        {icon}
      </span>
    ) : (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/25 ${boxSizes[size]}`}
      >
        {icon}
      </span>
    )

  if (!showWordmark) {
    return <span className={`inline-flex ${className}`}>{tile}</span>
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      {tile}
      <span className="min-w-0 text-left">
        <p
          className={`truncate font-semibold ${
            variant === 'onDark' ? 'text-white' : 'text-slate-900'
          } ${size === 'lg' ? 'text-base' : 'text-sm'}`}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className={`truncate ${
              variant === 'onDark' ? 'text-slate-400' : 'text-slate-500'
            } text-xs`}
          >
            {subtitle}
          </p>
        )}
      </span>
    </span>
  )
}
