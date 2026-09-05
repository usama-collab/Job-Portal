import { Briefcase, CheckCircle2 } from "lucide-react"
import { BrandLogo } from "./brand-logo"

interface AuthBrandPanelProps {
  description: string
}

export function AuthBrandPanel({ description }: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-linear-to-br from-blue-700 via-blue-600 to-indigo-700 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
      <div className="pointer-events-none absolute -bottom-36 -left-24 h-96 w-96 rounded-full border border-white/10 bg-white/5" />
      <div className="pointer-events-none absolute right-16 top-1/3 h-24 w-24 rounded-3xl border border-white/10 bg-white/5 rotate-12" />

      <BrandLogo className="relative" light />

      <div className="relative max-w-lg">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-blue-950/20 backdrop-blur-sm">
          <Briefcase className="h-12 w-12" strokeWidth={1.8} />
        </div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-blue-100">
          Your next move starts here
        </p>
        <h2 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
          Find work that feels like a step forward.
        </h2>
        <p className="mt-5 max-w-md text-base leading-7 text-blue-100">
          {description}
        </p>

        <div className="mt-9 grid gap-4 text-sm font-semibold text-white/90">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-200" />
            Discover opportunities that fit your goals
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-200" />
            Keep your applications organized in one place
          </div>
        </div>
      </div>

      <p className="relative text-xs font-medium text-blue-200">
        © {new Date().getFullYear()} Jobify. Build your future.
      </p>
    </aside>
  )
}

export function MobileAuthLogo() {
  return (
    <BrandLogo className="mb-10 lg:hidden" markClassName="h-10 w-10" wordmarkClassName="text-xl" />
  )
}
