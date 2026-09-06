import { useState } from 'react'
import { Button } from './ui/button'
import { startGoogleLogin } from '../lib/google-auth'

export function GoogleLoginButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function start() {
    setPending(true)
    setError('')
    try {
      await startGoogleLogin()
    } catch {
      setError('Unable to start Google sign-in. Please enable browser storage and try again.')
      setPending(false)
    }
  }
  return <div className="mb-5 space-y-3">
    <Button type="button" variant="outline" className="h-11 w-full rounded-xl" disabled={pending} onClick={start}>
      {pending ? 'Connecting to Google…' : 'Continue with Google'}
    </Button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <p className="text-center text-xs text-slate-500">or continue with email</p>
  </div>
}
