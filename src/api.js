const BASE_URL = 'https://blink.tail8ab50a.ts.net:8443/w2m'

const post = async (path, body) => {
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

const get = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export const createEvent = (data) => post('/events', data)

export const getEvent = (id) => get(`/events/${id}`)

export const submitAvailability = (eventId, data) =>
  post(`/events/${eventId}/availability`, data)

