import type { CreateEventRequest, Event, EventData, SubmitAvailabilityRequest } from './types'

const BASE_URL = 'https://blink.tail8ab50a.ts.net:8443/w2m'

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

const get = async <T>(path: string): Promise<T | null> => {
  const res = await fetch(`${BASE_URL}${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export const createEvent = (data: CreateEventRequest): Promise<Event> =>
  post('/events', data)

export const getEvent = (id: string): Promise<EventData | null> =>
  get(`/events/${id}`)

export const submitAvailability = (eventId: string, data: SubmitAvailabilityRequest): Promise<void> =>
  post(`/events/${eventId}/availability`, data)

