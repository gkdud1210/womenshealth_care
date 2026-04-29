interface LudiaLogoProps {
  size?: number
  className?: string
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function LudiaLogo({ size = 200, className }: LudiaLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/ludia-logo.png`}
      alt="LUDIA AI Health Chaperone"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    />
  )
}
