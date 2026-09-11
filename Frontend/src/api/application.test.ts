import { afterEach, expect, it, vi } from 'vitest'
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import api from './axios'
import { applyToJob, type ApplicationDetails } from './application'

const originalAdapter = api.defaults.adapter
afterEach(() => { api.defaults.adapter = originalAdapter })

it('sends application fields and the resume as FormData through the real Axios transforms', async () => {
  const resume = new File(['resume contents'], 'resume.pdf', { type: 'application/pdf' })
  const details: ApplicationDetails = {
    full_name: ' Test Candidate ', email: 'candidate@example.com', phone: '+15551234567',
    city: 'Lahore', current_job_title: '', total_experience_years: '0',
    current_salary: '', expected_salary: '', salary_currency: 'USD', notice_period: 'immediate',
    github_url: 'https://github.com/candidate', website_url: '', university_name: 'Test University',
    degree: 'Bachelor of Science', field_of_study: '', graduation_year: '2024',
    cover_letter: 'I would be a strong candidate for this role.',
  }
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    expect(config.headers.getContentType()).not.toContain('application/json')
    expect(config.data).toBeInstanceOf(FormData)
    const body = config.data as FormData
    expect(body.get('resume')).toBe(resume)
    expect(body.get('full_name')).toBe('Test Candidate')
    expect(body.get('total_experience_years')).toBe('0')
    expect(body.get('github_url')).toBe(details.github_url)
    expect(body.has('website_url')).toBe(false)
    expect(body.has('current_salary')).toBe(false)
    return { data: { id: 7 }, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config }
  })
  api.defaults.adapter = adapter
  expect(await applyToJob(2, details, resume)).toEqual({ id: 7 })
  expect(adapter).toHaveBeenCalledOnce()
})

it('still serializes ordinary API payloads as JSON', async () => {
  api.defaults.adapter = async (config) => {
    expect(config.headers.getContentType()).toBe('application/json')
    expect(config.data).toBe(JSON.stringify({ status: 'shortlisted' }))
    return { data: {}, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config }
  }
  await api.put('/applications/7/status', { status: 'shortlisted' })
})
