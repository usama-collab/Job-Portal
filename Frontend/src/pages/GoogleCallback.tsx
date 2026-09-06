import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { exchangeGoogleCallback } from '../lib/google-auth'
import { getAuthenticatedLandingPath } from '../lib/auth-session'
import { useAuthStore } from '../store/authStore'
import type { LoginResponse } from '../api/auth'

export default function GoogleCallback() {
  const exchange = useRef<Promise<LoginResponse> | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = useAuthStore(state => state.login)

  useEffect(() => {
    let active = true
    // Retain the same request during Strict Mode's effect cleanup/setup cycle.
    exchange.current ??= exchangeGoogleCallback()
    exchange.current.then(session => {
      if (!active) return
      if (!session || typeof session.access_token !== 'string' ||
          !getAuthenticatedLandingPath(session.access_token) ||
          typeof session.refresh_token !== 'string' || !session.refresh_token) {
        throw new Error('The server returned an invalid session. Please try again.')
      }
      try {
        queryClient.removeQueries({ queryKey: ['profile-me'] })
        login(session.access_token, session.refresh_token)
      } catch {
        throw new Error('Your session could not be saved. Please enable browser storage and try again.')
      }
      toast.success('Welcome back')
      navigate('/jobs', { replace: true })
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.')
    })
    return () => { active = false }
  }, [login, navigate, queryClient])

  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 className="text-2xl font-bold">Google sign-in</h1>
    {error ? <><p role="alert">{error}</p><Link className="text-blue-600 underline" to="/login">Back to login</Link></>
      : <p role="status">Completing your sign-in…</p>}
  </main>
}
