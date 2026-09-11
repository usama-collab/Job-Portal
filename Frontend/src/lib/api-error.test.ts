import { expect, it } from 'vitest'
import { getApiErrorDetail } from './api-error'

const apiError = (detail: unknown) => ({ isAxiosError: true, response: { data: { detail } } })

it('shows FastAPI validation messages with field names without exposing submitted inputs', () => {
  expect(getApiErrorDetail(apiError([
    { loc: ['body', 'resume'], msg: 'Field required', input: 'private value' },
    { loc: ['body', 'graduation_year'], msg: 'Input should be a valid integer' },
  ]), 'Fallback')).toBe('Resume: Field required; Graduation year: Input should be a valid integer')
})

it('preserves plain API messages and falls back for unexpected error shapes', () => {
  expect(getApiErrorDetail(apiError('Already applied'), 'Fallback')).toBe('Already applied')
  for (const error of [new Error('offline'), apiError(null), apiError([]), apiError([null, {}])]) {
    expect(getApiErrorDetail(error, 'Fallback')).toBe('Fallback')
  }
})
