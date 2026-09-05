import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Link } from "react-router-dom"
import { BrandLogo } from "./brand-logo"

interface AuthBrandPanelProps {
  description: string
}

export function AuthBrandPanel({ description }: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden h-dvh overflow-hidden bg-slate-950 text-white lg:block">
      <div className="auth-orb auth-orb-one pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-blue-600/40 blur-3xl" />
      <div className="auth-orb auth-orb-two pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-indigo-600/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),transparent_45%,rgba(79,70,229,0.14))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />

      <Link
        to="/"
        className="absolute right-8 top-7 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-md transition-all hover:-translate-x-0.5 hover:bg-white/15 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="auth-panel-content relative z-10 mx-auto flex h-full max-w-xl flex-col justify-center px-10 py-16 xl:px-12">
        <div className="auth-panel-rise">
          <div className="auth-panel-kicker mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            Smarter career moves
          </div>
          <h2 className="auth-panel-title max-w-lg text-4xl font-black leading-[1.08] tracking-[-0.045em] xl:text-[2.75rem]">
            Your next opportunity is already looking for you.
          </h2>
          <p className="auth-panel-description mt-4 max-w-lg text-sm leading-6 text-slate-300 xl:text-[15px]">
            {description}
          </p>
        </div>

        <div className="auth-match-card auth-panel-rise auth-panel-delay relative mt-8 rounded-[1.75rem] border border-white/15 bg-white/[0.08] p-4 shadow-[0_28px_80px_-28px_rgba(37,99,235,0.65)] backdrop-blur-xl xl:p-5">
          <div className="auth-match-card-header flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-950/40">
                <BriefcaseBusiness className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">Career match center</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Fresh roles selected for you</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="auth-status-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>

          <div className="auth-job-list mt-4 space-y-3">
            <div className="auth-primary-job auth-job-card rounded-2xl border border-blue-400/30 bg-white/[0.09] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-black text-slate-950">N</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">Senior Product Designer</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" /> Remote · Northstar Labs</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-300" />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="auth-match-bar h-full w-[94%] rounded-full bg-linear-to-r from-blue-400 to-cyan-300" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-200">94% match</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-secondary-job auth-job-card auth-job-delay flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 font-black">L</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Frontend Engineer</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Lumon · Full-time</p>
              </div>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">New</span>
            </div>
          </div>

          <div className="auth-float-card absolute -bottom-6 -left-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500"><Check className="h-4 w-4" /></span>
            <div><p className="text-xs font-bold">Profile verified</p><p className="mt-0.5 text-[10px] text-slate-400">You stand out to teams</p></div>
          </div>

          <div className="auth-float-card auth-float-delay absolute -right-4 -top-5 flex items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-600 px-3 py-2 shadow-xl shadow-blue-950/30">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[11px] font-bold">12 new matches</span>
          </div>
        </div>

        <div className="auth-panel-metrics mt-10 flex items-center gap-6 text-[11px] font-semibold text-slate-400">
          <span><strong className="mr-1 text-sm text-white">2.5k+</strong> open roles</span>
          <span className="h-4 w-px bg-white/15" />
          <span><strong className="mr-1 text-sm text-white">94%</strong> verified listings</span>
        </div>
      </div>
    </aside>
  )
}

export function MobileAuthLogo() {
  return (
    <BrandLogo markClassName="h-10 w-10" wordmarkClassName="text-xl" />
  )
}
