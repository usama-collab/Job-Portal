import api from '../api/axios'
import type { LoginResponse } from '../api/auth'

export const GOOGLE_VERIFIER_KEY = 'google-login-verifier'

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startGoogleLogin() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  sessionStorage.setItem(GOOGLE_VERIFIER_KEY, verifier)
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) throw new Error('Google sign-in is not configured.')
  window.location.assign(`${base.replace(/\/$/, '')}/googleauth/login?challenge=${base64url(new Uint8Array(digest))}`)
}

const errors: Record<string, string> = {
  cancelled: 'Google sign-in was cancelled. Please try again.',
  invalid_state: 'Google sign-in expired or started in another browser. Please try again.',
  invalid_identity: 'Google must provide a verified email to sign in.',
  inactive: 'This account is not available.',
  unavailable: 'Google sign-in is unavailable. Please try again shortly.',
}

export async function exchangeGoogleCallback(): Promise<LoginResponse> {
  const params = new URLSearchParams(window.location.hash.slice(1))
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  let verifier: string | null
  try {
    verifier = sessionStorage.getItem(GOOGLE_VERIFIER_KEY)
    sessionStorage.removeItem(GOOGLE_VERIFIER_KEY)
  } catch {
    throw new Error('Please enable browser storage and try signing in again.')
  }
  if (params.has('error')) throw new Error(errors[params.get('error')!] ?? errors.unavailable)
  if (!verifier) throw new Error('Sign-in must finish in the browser tab where it started. Please try again.')
  const code = params.get('code')
  if (!code) throw new Error('The Google sign-in code is missing. Please try again.')
  try {
    const response = await api.post<LoginResponse>('/googleauth/exchange', { code, verifier }, { skipAuthRefresh: true })
    return response.data
  } catch {
    throw new Error('Google sign-in could not be completed. It may have expired. Please try again.')
  }
}
