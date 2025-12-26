import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, submitAvailability } from './api'
import { getSlotColor } from './utils'
import type { EventData } from './types'

interface SubmitMessage {
  type: 'error' | 'success'
  text: string
}

export default function EventView() {
  const { eventId } = useParams<{ eventId: string }>()
  const [data, setData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<SubmitMessage | null>(null)

  const fetchData = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getEvent(eventId)
      if (!result) return setError('Event not found')
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSlot = (slot: string) => {
    if (!name.trim()) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(slot) ? next.delete(slot) : next.add(slot)
      return next
    })
    setSubmitMsg(null)
  }

  const handleSubmit = async () => {
    if (!eventId || !name.trim()) return setSubmitMsg({ type: 'error', text: 'Enter your name' })
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      await submitAvailability(eventId, {
        participant_name: name.trim(),
        available_slots: [...selected],
        ...(password.trim() && { password: password.trim() }),
      })
      setSubmitMsg({ type: 'success', text: 'Saved!' })
      fetchData()
    } catch (e) {
      setSubmitMsg({ type: 'error', text: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setSubmitting(false)
    }
  }

  const getParticipants = (slot: string): string[] =>
    data?.availabilities?.filter((a) => a.available_slots.includes(slot)).map((a) => a.participant_name) ?? []

  if (loading) return <div>Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!data) return null

  const { event, availabilities, summary } = data
  const total = availabilities?.length ?? 0

  return (
    <div className="container">
      <h1>{event.name}</h1>
      {event.description && <p>{event.description}</p>}
      {event.creator_name && <p>Created by: {event.creator_name}</p>}

      <div className="share-link-row">
        <input readOnly value={window.location.href} />
        <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy</button>
      </div>

      <div className="section">
        <h3>Availability</h3>
        <div className="legend">
          <span><span className="legend-box" style={{ background: '#ff4444' }} /> None</span>
          <span><span className="legend-box" style={{ background: '#ffcc00' }} /> Some</span>
          <span><span className="legend-box" style={{ background: '#44ff44' }} /> All ({total})</span>
        </div>
        <div className="availability-grid-wrapper">
          <table className="availability-grid">
            <thead>
              <tr>
                <th />
                {event.dates.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {event.time_slots.map((t) => (
                <tr key={t}>
                  <td>{t}</td>
                  {event.dates.map((d) => {
                    const slot = `${d} ${t}`
                    const count = summary?.[slot] ?? 0
                    const participants = getParticipants(slot)
                    return (
                      <td
                        key={slot}
                        className={`slot-cell${selected.has(slot) ? ' selected' : ''}${!name.trim() ? ' disabled' : ''}`}
                        style={{ background: getSlotColor(count, total) }}
                        onClick={() => toggleSlot(slot)}
                        title={participants.join(', ') || 'None'}
                      >
                        {count}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="participant-list">
            {availabilities.map((a) => <span key={a.participant_name}>{a.participant_name}</span>)}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Your Availability</h3>
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="form-group">
          <label>Password (optional)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {name.trim() && <p>Click cells above to select</p>}
        {selected.size > 0 && <p>Selected: {selected.size}</p>}
        {submitMsg && <div className={submitMsg.type}>{submitMsg.text}</div>}
        <button onClick={handleSubmit} disabled={submitting || !name.trim()}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

