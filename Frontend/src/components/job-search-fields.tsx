import { MapPin, Search } from 'lucide-react'

interface JobSearchFieldsProps {
  search: string
  location: string
  onSearchChange: (value: string) => void
  onLocationChange: (value: string) => void
}

export function JobSearchFields({ search, location, onSearchChange, onLocationChange }: JobSearchFieldsProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0">
      <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset">
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
        <input aria-label="Job title, keywords, or company" value={search} onChange={(e) => onSearchChange(e.target.value)} className="h-12 min-w-0 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" placeholder="Job title, keywords, or company" />
      </label>
      <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset">
        <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
        <input aria-label="City, ZIP or postal code" value={location} onChange={(e) => onLocationChange(e.target.value)} className="h-12 min-w-0 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" placeholder="City, ZIP or postal code" />
      </label>
    </div>
  )
}
