import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent, submitAvailability } from './api'
import { getSlotColor, buildSlotId, formatDateLocal, formatTimeLocal } from './utils'
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
  const dragMode = useRef<'select' | 'deselect' | null>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const nameRef = useRef(name)
  const selectedRef = useRef(selected)

  useEffect(() => { nameRef.current = name }, [name])
  useEffect(() => { selectedRef.current = selected }, [selected])

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

  useEffect(() => {
    if (!data || !name.trim()) return
    const existing = data.availabilities.find(
      (a) => a.participant_name.toLowerCase() === name.trim().toLowerCase()
    )
    setSelected(new Set(existing?.available_slots ?? []))
  }, [name, data])

  useEffect(() => {
    const handleMouseUp = () => { dragMode.current = null }
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const getSlotFromTouch = (touch: Touch): string | null => {
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      return el?.getAttribute('data-slot') ?? null
    }

    const handleTouchStart = (e: TouchEvent) => {
      const slot = getSlotFromTouch(e.touches[0])
      if (!slot || !nameRef.current.trim()) return
      e.preventDefault()
      dragMode.current = selectedRef.current.has(slot) ? 'deselect' : 'select'
      updateSlot(slot)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!nameRef.current.trim() || !dragMode.current) return
      e.preventDefault()
      const slot = getSlotFromTouch(e.touches[0])
      if (slot) updateSlot(slot)
    }

    grid.addEventListener('touchstart', handleTouchStart, { passive: false })
    grid.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      grid.removeEventListener('touchstart', handleTouchStart)
      grid.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  const handleSlotMouseDown = (slot: string) => {
    if (!name.trim()) return
    dragMode.current = selected.has(slot) ? 'deselect' : 'select'
    updateSlot(slot)
  }

  const handleSlotMouseEnter = (slot: string) => {
    if (!name.trim() || !dragMode.current) return
    updateSlot(slot)
  }

  const updateSlot = (slot: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      dragMode.current === 'select' ? next.add(slot) : next.delete(slot)
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
          <table className="availability-grid" ref={gridRef}>
            <thead>
              <tr>
                <th />
                {event.dates.map((d) => {
                  const sampleSlot = buildSlotId(d, event.time_slots[0])
                  return <th key={d}>{formatDateLocal(sampleSlot)}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {event.time_slots.map((t) => {
                const sampleSlot = buildSlotId(event.dates[0], t)
                return (
                  <tr key={t}>
                    <td>{formatTimeLocal(sampleSlot)}</td>
                    {event.dates.map((d) => {
                      const slot = buildSlotId(d, t)
                      const count = summary?.[slot] ?? 0
                      const participants = getParticipants(slot)
                      return (
                        <td
                          key={slot}
                          className={`slot-cell${selected.has(slot) ? ' selected' : ''}${!name.trim() ? ' disabled' : ''}`}
                          style={{ background: getSlotColor(count, total) }}
                          onMouseDown={() => handleSlotMouseDown(slot)}
                          onMouseEnter={() => handleSlotMouseEnter(slot)}
                          data-slot={slot}
                          title={participants.join(', ') || 'None'}
                        >
                          {count}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
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
        {name.trim() && (
          <p>
            {availabilities.some((a) => a.participant_name.toLowerCase() === name.trim().toLowerCase())
              ? 'Editing existing availability. Click or drag to toggle.'
              : 'Click or drag on cells to select.'}
          </p>
        )}
        {selected.size > 0 && <p>Selected: {selected.size}</p>}
        {submitMsg && <div className={submitMsg.type}>{submitMsg.text}</div>}
        <button onClick={handleSubmit} disabled={submitting || !name.trim()}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

