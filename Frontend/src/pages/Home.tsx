import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight, BadgeCheck, BarChart3, Bookmark, BriefcaseBusiness, Building2,
  Check, ChevronRight, CircleDollarSign, Clock3, Code2, Headphones, HeartPulse,
  MapPin, Megaphone, Palette, Play, Quote, Search, ShieldCheck, Sparkles, Star,
  TrendingUp, Users,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { BrandLogo } from "../components/brand-logo"

const categories = [
  { name: "Development", count: "1,240 jobs", icon: Code2, color: "bg-blue-50 text-blue-600" },
  { name: "Design", count: "860 jobs", icon: Palette, color: "bg-violet-50 text-violet-600" },
  { name: "Marketing", count: "720 jobs", icon: Megaphone, color: "bg-orange-50 text-orange-600" },
  { name: "Finance", count: "540 jobs", icon: CircleDollarSign, color: "bg-emerald-50 text-emerald-600" },
  { name: "Customer success", count: "420 jobs", icon: Headphones, color: "bg-pink-50 text-pink-600" },
  { name: "Healthcare", count: "390 jobs", icon: HeartPulse, color: "bg-red-50 text-red-500" },
  { name: "Sales", count: "650 jobs", icon: TrendingUp, color: "bg-cyan-50 text-cyan-600" },
  { name: "Operations", count: "310 jobs", icon: BarChart3, color: "bg-amber-50 text-amber-600" },
]

const featuredJobs = [
  { title: "Senior Product Designer", company: "Northstar Labs", location: "Remote", salary: "$120k – $145k", initial: "N", tone: "bg-blue-600" },
  { title: "Frontend Engineer", company: "Lumon Finance", location: "New York, NY", salary: "$130k – $160k", initial: "L", tone: "bg-violet-600" },
  { title: "Growth Marketing Lead", company: "Fieldwork", location: "Remote", salary: "$105k – $125k", initial: "F", tone: "bg-emerald-600" },
]

const testimonials = [
  { quote: "Jobify made the search feel focused. I found a role that genuinely fits how I want to grow.", name: "Maya Chen", role: "Product designer", initials: "MC", color: "bg-violet-100 text-violet-700" },
  { quote: "The quality of candidates stood out immediately. We filled a critical engineering role in days.", name: "Daniel Brooks", role: "Hiring manager", initials: "DB", color: "bg-blue-100 text-blue-700" },
  { quote: "Clean, quick, and refreshingly simple. I always knew where each application stood.", name: "Sarah Ali", role: "Frontend engineer", initials: "SA", color: "bg-emerald-100 text-emerald-700" },
]

const Home = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const findJobs = (event: FormEvent) => {
    event.preventDefault()
    navigate(search.trim() ? `/jobs?q=${encodeURIComponent(search.trim())}` : "/jobs")
  }
  const browse = (term: string) => navigate(`/jobs?q=${encodeURIComponent(term)}`)

  return (
    <div className="overflow-hidden bg-white text-slate-950">
      <section className="relative isolate border-b border-slate-100 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_88%)] px-5 pb-20 pt-16 sm:px-6 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-32 -top-20 -z-10 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.03fr_.97fr]">
          <div className="home-rise">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm shadow-blue-100/60">
              <Sparkles className="h-3.5 w-3.5 fill-blue-100" /> Smarter job search, brighter next chapter
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.06] tracking-[-0.055em] sm:text-6xl lg:text-[4.65rem]">
              Find work that <span className="relative whitespace-nowrap text-blue-600">moves you forward<span className="absolute -bottom-1 left-0 -z-10 h-2 w-full -rotate-1 rounded-full bg-blue-200/70" /></span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">Discover meaningful opportunities from trusted teams, build your profile, and take the next step in your career—all in one place.</p>
            <form onSubmit={findJobs} className="mt-9 flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-18px_rgba(15,23,42,0.2)] sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3" aria-label="Search jobs">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" placeholder="Job title, skill, or company" />
              </label>
              <Button type="submit" className="h-12 rounded-xl bg-blue-600 px-7 font-bold text-white shadow-lg shadow-blue-200 hover:-translate-y-0.5 hover:bg-blue-700">Search jobs <ArrowRight /></Button>
            </form>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-500"><span className="text-slate-400">Popular:</span>{["Remote", "Product design", "Engineering"].map(term => <button key={term} onClick={() => browse(term)} className="hover:text-blue-600">{term}</button>)}</div>
            <div className="mt-10 flex flex-wrap gap-8 border-t border-slate-200 pt-7 sm:gap-12">
              {[["10k+", "active job seekers"], ["2.5k+", "open roles"], ["94%", "verified listings"]].map(([value, label]) => <div key={label}><p className="text-2xl font-black tracking-tight">{value}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p></div>)}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl home-rise home-delay-1">
            <div className="absolute -left-6 top-20 h-32 w-32 rounded-full bg-blue-300/30 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-[0_35px_90px_-30px_rgba(30,64,175,0.35)] backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between px-1"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Recommended for you</p><h2 className="mt-1 text-xl font-black">Your next opportunity</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Sparkles className="h-5 w-5" /></span></div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-lg shadow-blue-100/50 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-black text-white">A</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><h3 className="font-black">Senior Product Designer</h3><p className="mt-1 text-sm font-semibold text-slate-500">Arcade Studio</p></div><Bookmark className="h-5 w-5 shrink-0 text-blue-600" /></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5">Remote</span><span className="rounded-lg bg-slate-100 px-2.5 py-1.5">Full-time</span><span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700">$120k–$145k</span></div></div></div>
                </div>
                {[["L", "Frontend Engineer", "Lumon · New York", "bg-violet-600"], ["F", "Growth Marketing Lead", "Fieldwork · Remote", "bg-emerald-600"]].map(([letter, title, detail, tone]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white/90 p-5 transition-all hover:border-blue-200 hover:shadow-lg"><div className="flex items-center gap-4"><div className={`flex h-11 w-11 items-center justify-center rounded-xl font-black text-white ${tone}`}>{letter}</div><div className="flex-1"><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p></div><ChevronRight className="h-5 w-5 text-slate-400" /></div></div>)}
              </div>
            </div>
            <div className="absolute -right-3 -top-6 flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:-right-8 home-float"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><BadgeCheck className="h-4 w-4" /></span><div><p className="text-xs font-black">Profile matched</p><p className="text-[10px] font-semibold text-slate-400">98% fit</p></div></div>
            <div className="absolute -bottom-7 -left-3 flex items-center gap-3 rounded-2xl border border-white bg-slate-950 px-4 py-3 text-white shadow-2xl sm:-left-8 home-float home-delay-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500"><Check className="h-4 w-4" /></span><div><p className="text-xs font-black">Application sent</p><p className="text-[10px] text-slate-400">You’re one step closer</p></div></div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 py-9"><div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-6 lg:flex-row lg:justify-between"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Trusted by ambitious teams</p><div className="flex flex-wrap justify-center gap-x-12 gap-y-5 text-lg font-black tracking-tight text-slate-400"><span>Northstar</span><span>Lumon</span><span>FIELDWORK</span><span className="italic">Arcade</span><span>Vertex</span></div></div></section>

      <section id="categories" className="px-5 py-24 sm:px-6"><div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Explore your path" title="Find the right role for you" copy="Browse opportunities across today’s most in-demand fields." action={() => navigate("/jobs")} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map(({ name, count, icon: Icon, color }) => <button key={name} onClick={() => browse(name)} className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_-20px_rgba(37,99,235,0.3)]"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">{name}</span><span className="mt-1 block text-xs font-semibold text-slate-400">{count}</span></span><ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" /></button>)}</div>
      </div></section>

      <section id="how-it-works" className="bg-slate-950 px-5 py-24 text-white sm:px-6"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">Simple by design</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">From searching to hired, minus the hassle</h2><p className="mt-4 leading-7 text-slate-400">We keep the process clear so you can focus on finding work you’ll love.</p></div>
        <div className="relative mt-16 grid gap-6 md:grid-cols-3"><div className="absolute left-[17%] right-[17%] top-8 hidden border-t border-dashed border-slate-700 md:block" />{[
          { icon: Search, step: "01", title: "Discover your fit", copy: "Search curated jobs by role, skill, company, or location." },
          { icon: Users, step: "02", title: "Show who you are", copy: "Create a profile that gives employers a clear picture of your value." },
          { icon: BriefcaseBusiness, step: "03", title: "Make your move", copy: "Apply with confidence and keep every opportunity organized." },
        ].map(({ icon: Icon, step, title, copy }) => <div key={step} className="relative rounded-3xl border border-slate-800 bg-slate-900/70 p-8 transition-all hover:-translate-y-1 hover:border-blue-500/50"><div className="flex items-center justify-between"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-950"><Icon className="h-7 w-7" /></span><span className="text-4xl font-black text-slate-800">{step}</span></div><h3 className="mt-7 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p></div>)}</div>
      </div></section>

      <section className="bg-slate-50 px-5 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Hand-picked opportunities" title="Jobs worth getting excited about" action={() => navigate("/jobs")} />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">{featuredJobs.map(job => <button key={job.title} onClick={() => navigate("/jobs")} className="group rounded-3xl border border-slate-200 bg-white p-6 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_60px_-25px_rgba(15,23,42,0.3)]"><div className="flex justify-between"><span className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black text-white ${job.tone}`}>{job.initial}</span><span className="h-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700">New</span></div><h3 className="mt-6 text-xl font-black group-hover:text-blue-600">{job.title}</h3><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500"><Building2 className="h-4 w-4" />{job.company}</p><div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Full-time</span></div><div className="mt-5 flex items-center justify-between"><span className="font-extrabold">{job.salary}</span><span className="flex items-center gap-1 text-sm font-bold text-blue-600">View role <ChevronRight className="h-4 w-4 group-hover:translate-x-1" /></span></div></button>)}</div>
      </div></section>

      <section className="px-5 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Real career momentum</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Loved by people on both sides of hiring</h2></div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">{testimonials.map(item => <figure key={item.name} className="relative rounded-3xl border border-slate-200 p-7 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.25)]"><Quote className="absolute right-7 top-7 h-8 w-8 fill-blue-50 text-blue-100" /><div className="flex gap-1 text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><blockquote className="mt-6 text-[15px] font-medium leading-7 text-slate-700">“{item.quote}”</blockquote><figcaption className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${item.color}`}>{item.initials}</span><span><span className="block text-sm font-black">{item.name}</span><span className="block text-xs text-slate-400">{item.role}</span></span></figcaption></figure>)}</div>
      </div></section>

      <section className="px-5 pb-24 sm:px-6"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-blue-600 px-7 py-14 text-white shadow-2xl shadow-blue-200 sm:px-12 lg:px-16"><div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border-[60px] border-white/10" /><div className="relative flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-center"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Build your team</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Great people are looking for you, too.</h2><p className="mt-4 max-w-xl leading-7 text-blue-100">Share your role with motivated candidates and turn your next great hire into your team’s next big win.</p></div><div className="flex flex-wrap gap-3"><Button onClick={() => navigate("/register")} className="h-12 rounded-xl bg-white px-6 font-black text-blue-700 hover:bg-blue-50">Post a job <ArrowRight /></Button><button onClick={() => navigate("/jobs")} className="flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold hover:bg-white/10"><Play className="h-4 w-4 fill-white" />Explore Jobify</button></div></div></div></section>

      <footer className="bg-slate-950 px-5 pb-8 pt-16 text-slate-400 sm:px-6"><div className="mx-auto max-w-7xl"><div className="grid gap-12 border-b border-slate-800 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div><BrandLogo light /><p className="mt-5 max-w-xs text-sm leading-6">Helping ambitious people and thoughtful companies find the right fit.</p><div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-400" />Secure, verified opportunities</div></div>
        <FooterColumn title="For candidates" links={[["Browse jobs", "/jobs"], ["Create account", "/register"], ["My applications", "/applications"], ["Career profile", "/profile"]]} />
        <FooterColumn title="For employers" links={[["Post a job", "/register"], ["Recruiting dashboard", "/employer/dashboard"], ["How it works", "/#how-it-works"], ["Talent categories", "/#categories"]]} />
        <div><h3 className="text-sm font-black text-white">Company</h3><div className="mt-5 grid gap-3 text-sm"><a href="#how-it-works" className="hover:text-white">About Jobify</a><a href="mailto:hello@jobify.com" className="hover:text-white">Contact</a><span>Privacy</span><span>Terms</span></div></div>
      </div><div className="flex flex-col gap-3 pt-7 text-xs font-medium sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Jobify. All rights reserved.</p><p>Designed for better career moves.</p></div></div></footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action: () => void }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{title}</h2>{copy && <p className="mt-3 text-slate-500">{copy}</p>}</div><button onClick={action} className="group flex items-center gap-2 text-sm font-bold text-blue-600">View all jobs <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button></div>
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div><h3 className="text-sm font-black text-white">{title}</h3><div className="mt-5 grid gap-3 text-sm">{links.map(([label, to]) => <Link key={label} to={to} className="hover:text-white">{label}</Link>)}</div></div>
}

export default Home
