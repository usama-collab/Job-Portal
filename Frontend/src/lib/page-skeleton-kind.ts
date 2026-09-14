export type SkeletonKind = 'jobs' | 'job-detail' | 'apply' | 'applications' | 'profile' |
  'dashboard' | 'applicants' | 'job-form' | 'onboarding' | 'messages' |
  'notifications' | 'auth' | 'password'

export function skeletonKindForPath(pathname: string): SkeletonKind {
  if (pathname === '/jobs') return 'jobs'
  if (/^\/jobs\/[^/]+\/apply$/.test(pathname)) return 'apply'
  if (pathname.startsWith('/jobs/')) return 'job-detail'
  if (pathname === '/applications') return 'applications'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/employer/dashboard') return 'dashboard'
  if (/^\/employer\/jobs\/[^/]+\/applicants$/.test(pathname)) return 'applicants'
  if (pathname === '/employer/jobs/create' || /^\/employer\/jobs\/[^/]+\/edit$/.test(pathname)) return 'job-form'
  if (pathname === '/employer/onboarding') return 'onboarding'
  if (pathname.startsWith('/messages')) return 'messages'
  if (pathname === '/notifications') return 'notifications'
  if (pathname === '/login' || pathname === '/register') return 'auth'
  if (pathname === '/forgot-password' || pathname === '/reset-password') return 'password'
  return 'jobs'
}
