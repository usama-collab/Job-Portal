import { useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

const DISMISSED_KEY = 'jobify-demo-limit-notice-september-2026'

export function DemoAvailabilityNotice() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) !== 'dismissed'
    } catch {
      return true
    }
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      try {
        sessionStorage.setItem(DISMISSED_KEY, 'dismissed')
      } catch {
        // The notice remains dismissible when browser storage is unavailable.
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed bottom-4 left-4 z-40 gap-2 rounded-full border-amber-200 bg-amber-50 text-amber-950 shadow-md hover:bg-amber-100">
          <Info aria-hidden="true" />
          Demo availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 sm:max-w-lg sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <Info className="size-6" aria-hidden="true" />
        </div>
        <DialogHeader className="gap-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">A note about this live demo</p>
          <DialogTitle className="text-2xl leading-tight">Some features are temporarily unavailable</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Jobify is a portfolio project hosted on free services. Its database has reached its monthly free usage limit, so features that need stored data are temporarily unavailable.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">What this means for your visit</p>
          <p className="mt-2">Signing in, creating an account, loading job listings, and other features that read or save data won’t work while the database is paused. Some pages may show loading or error messages.</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can still explore the site’s design and available pages. If you’re reviewing this project for a role, thank you for taking a look and for understanding the limits of this free-hosted demo.
        </p>
        <DialogClose asChild>
          <Button className="mt-1 w-full" size="lg">Continue exploring</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
