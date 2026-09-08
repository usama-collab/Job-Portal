import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient } from '@tanstack/react-query'
import api, { refreshAccessToken } from './axios'
import { installNotificationSession } from '../lib/notification-session'
import { useAuthStore } from '../store/authStore'

const token = (id: number) => `e30.${btoa(JSON.stringify({ sub: String(id), exp: 9999999999 }))}.test`
let uninstall: () => void
beforeEach(() => { uninstall = installNotificationSession(new QueryClient()); useAuthStore.getState().login(token(1), 'refresh-a') })
afterEach(() => { useAuthStore.getState().logout(); uninstall(); vi.restoreAllMocks() })

it('does not overwrite a new account with an old refresh response', async () => {
  let finish!: (value: never) => void
  vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const refreshing = refreshAccessToken()
  useAuthStore.getState().login(token(2), 'refresh-b')
  finish({ data: { access_token: token(1), refresh_token: 'rotated-a' } } as never)
  expect(await refreshing).toBeNull()
  expect(localStorage.getItem('token')).toBe(token(2))
})

it('cancels an old message request rather than replaying it after an account switch', async () => {
  let reject!: (error: unknown) => void
  let sentConfig!: InternalAxiosRequestConfig
  const adapter = vi.fn((config: InternalAxiosRequestConfig) => {
    sentConfig = config
    return new Promise<never>((_resolve, fail) => { reject = fail })
  })
  const refresh = vi.spyOn(axios, 'post')
  const pending = api.post('/applications/8/messages', { body: 'private' }, { adapter })
  const rejection = expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  await vi.waitFor(() => expect(adapter).toHaveBeenCalledOnce())
  useAuthStore.getState().login(token(2), 'refresh-b')
  reject(new AxiosError('expired', '401', sentConfig, undefined, { status: 401 } as never))
  await rejection
  expect(refresh).not.toHaveBeenCalled()
  expect(adapter).toHaveBeenCalledOnce()
})
