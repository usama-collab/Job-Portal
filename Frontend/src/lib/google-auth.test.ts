import { webcrypto } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { GOOGLE_VERIFIER_KEY, startGoogleLogin } from './google-auth'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  sessionStorage.clear()
})
it('stores a random verifier and navigates with only its SHA-256 challenge', async () => {
  const assign = vi.fn()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('window', { location: { assign } })
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
  await startGoogleLogin()
  const verifier = sessionStorage.getItem(GOOGLE_VERIFIER_KEY)!
  expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = Buffer.from(digest).toString('base64url')
  expect(assign).toHaveBeenCalledExactlyOnceWith(`https://api.example.com/googleauth/login?challenge=${challenge}`)
  expect(assign.mock.calls[0][0]).not.toContain(verifier)
})
