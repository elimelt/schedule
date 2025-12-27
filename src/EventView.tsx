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

    const applySlotUpdate = (slot: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        dragMode.current === 'select' ? next.add(slot) : next.delete(slot)
        return next
      })
      setSubmitMsg(null)
    }

    const handleTouchStart = (e: TouchEvent) => {
      const slot = getSlotFromTouch(e.touches[0])
      if (!slot || !nameRef.current.trim()) return
      e.preventDefault()
      dragMode.current = selectedRef.current.has(slot) ? 'deselect' : 'select'
      applySlotUpdate(slot)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!nameRef.current.trim() || !dragMode.current) return
      e.preventDefault()
      const slot = getSlotFromTouch(e.touches[0])
      if (slot) applySlotUpdate(slot)
    }

    grid.addEventListener('touchstart', handleTouchStart, { passive: false })
    grid.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      grid.removeEventListener('touchstart', handleTouchStart)
      grid.removeEventListener('touchmove', handleTouchMove)
    }
  }, [data])

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

  if (loading) return <div role="status" aria-live="polite">Loading...</div>
  if (error) return <div className="error" role="alert">{error}</div>
  if (!data) return null

  const { event, availabilities, summary } = data
  const total = availabilities?.length ?? 0

  const toggleSlotKeyboard = (e: React.KeyboardEvent, slot: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!name.trim()) return
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(slot) ? next.delete(slot) : next.add(slot)
        return next
      })
      setSubmitMsg(null)
    }
  }

  return (
    <main className="container">
      <h1>{event.name}</h1>
      {event.description && <p>{event.description}</p>}
      {event.creator_name && <p>Created by: {event.creator_name}</p>}

      <div className="share-link-row">
        <label htmlFor="share-url" className="sr-only">Event URL</label>
        <input id="share-url" readOnly value={window.location.href} aria-describedby="copy-hint" />
        <button onClick={() => navigator.clipboard.writeText(window.location.href)} aria-label="Copy event URL to clipboard">Copy</button>
        <span id="copy-hint" className="sr-only">Click copy to copy the event URL</span>
      </div>

      <section className="section" aria-labelledby="availability-heading">
        <h2 id="availability-heading">Availability</h2>
        <div className="legend" role="list" aria-label="Color legend">
          <span role="listitem"><span className="legend-box" style={{ background: '#cc0000' }} aria-hidden="true" /> None available</span>
          <span role="listitem"><span className="legend-box" style={{ background: '#cc9900' }} aria-hidden="true" /> Some available</span>
          <span role="listitem"><span className="legend-box" style={{ background: '#228822' }} aria-hidden="true" /> All available ({total})</span>
        </div>
        <div className="availability-grid-wrapper">
          <table className="availability-grid" ref={gridRef} role="grid" aria-label="Availability schedule grid">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Time</span></th>
                {event.dates.map((d) => {
                  const sampleSlot = buildSlotId(d, event.time_slots[0])
                  return <th key={d} scope="col">{formatDateLocal(sampleSlot)}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {event.time_slots.map((t) => {
                const sampleSlot = buildSlotId(event.dates[0], t)
                return (
                  <tr key={t}>
                    <th scope="row">{formatTimeLocal(sampleSlot)}</th>
                    {event.dates.map((d) => {
                      const slot = buildSlotId(d, t)
                      const count = summary?.[slot] ?? 0
                      const participants = getParticipants(slot)
                      const isSelected = selected.has(slot)
                      const isDisabled = !name.trim()
                      return (
                        <td
                          key={slot}
                          className={`slot-cell${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                          style={{ background: getSlotColor(count, total) }}
                          onMouseDown={() => handleSlotMouseDown(slot)}
                          onMouseEnter={() => handleSlotMouseEnter(slot)}
                          onKeyDown={(e) => toggleSlotKeyboard(e, slot)}
                          data-slot={slot}
                          tabIndex={isDisabled ? -1 : 0}
                          role="gridcell"
                          aria-selected={isSelected}
                          aria-disabled={isDisabled}
                          aria-label={`${formatDateLocal(slot)} ${formatTimeLocal(slot)}, ${count} of ${total} available${participants.length ? `: ${participants.join(', ')}` : ''}`}
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
          <div className="participant-list" role="list" aria-label="Participants">
            {availabilities.map((a) => <span key={a.participant_name} role="listitem">{a.participant_name}</span>)}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="your-availability-heading">
        <h2 id="your-availability-heading">Your Availability</h2>
        <div className="form-group">
          <label htmlFor="participant-name">Name</label>
          <input id="participant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-describedby="name-hint" />
          <span id="name-hint" className="sr-only">Enter your name to enable slot selection</span>
        </div>
        <div className="form-group">
          <label htmlFor="participant-password">Password (optional)</label>
          <input id="participant-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="password-hint" />
          <span id="password-hint" className="sr-only">Optional password to protect your availability</span>
        </div>
        {name.trim() && (
          <p aria-live="polite">
            {availabilities.some((a) => a.participant_name.toLowerCase() === name.trim().toLowerCase())
              ? 'Editing existing availability. Click, drag, or press Enter/Space to toggle.'
              : 'Click, drag, or press Enter/Space on cells to select.'}
          </p>
        )}
        {selected.size > 0 && <p aria-live="polite">Selected: {selected.size} time slots</p>}
        <div aria-live="assertive">
          {submitMsg && <div className={submitMsg.type} role="alert">{submitMsg.text}</div>}
        </div>
        <button onClick={handleSubmit} disabled={submitting || !name.trim()} aria-busy={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </section>
    </main>
  )
}

