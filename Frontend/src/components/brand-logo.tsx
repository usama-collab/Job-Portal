import { useId } from "react"
import { Link } from "react-router-dom"

interface BrandLogoProps {
  className?: string
  wordmarkClassName?: string
  markClassName?: string
  light?: boolean
}

export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  const gradientId = useId()
  const shadowId = useId()

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Jobify"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="5" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-15%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1D4ED8" floodOpacity=".25" />
        </filter>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="13" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path
        d="M16 20.5h16a3 3 0 0 1 3 3v8.25a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V23.5a3 3 0 0 1 3-3Z"
        stroke="white"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M20 20.5v-2.25A2.25 2.25 0 0 1 22.25 16h3.5A2.25 2.25 0 0 1 28 18.25v2.25" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M13 26.3c3.35 1.8 7.03 2.7 11 2.7s7.65-.9 11-2.7" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 27v4" stroke="#BFDBFE" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function BrandLogo({
  className = "",
  wordmarkClassName = "",
  markClassName = "h-11 w-11",
  light = false,
}: BrandLogoProps) {
  return (
    <Link to="/" className={`group flex w-fit items-center gap-2.5 ${className}`} aria-label="Jobify home">
      <BrandMark className={`${markClassName} transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105`} />
      <span className={`text-[1.45rem] font-black tracking-[-0.045em] ${light ? "text-white" : "text-slate-950"} ${wordmarkClassName}`}>
        Jobify<span className={light ? "text-blue-200" : "text-blue-600"}>.</span>
      </span>
    </Link>
  )
}
