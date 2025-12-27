import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, type DateObject } from 'react-multi-date-picker'
import { createEvent } from './api'
import { generateTimeSlots, convertSlotsToUtc } from './utils'

interface FormState {
  name: string
  description: string
  creatorName: string
  startTime: string
  endTime: string
  interval: number
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    creatorName: '',
    startTime: '09:00',
    endTime: '17:00',
    interval: 30,
  })
  const [dates, setDates] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateForm = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleDateChange = (selected: DateObject[]) =>
    setDates(selected.map((d) => d.format('YYYY-MM-DD')).sort())

  const handleGenerateSlots = () =>
    setTimeSlots(generateTimeSlots(form.startTime, form.endTime, form.interval))

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Event name is required'
    if (!dates.length) return 'At least one date is required'
    if (!timeSlots.length) return 'Please generate time slots'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) return setError(err)

    setLoading(true)
    setError(null)
    try {
      const utc = convertSlotsToUtc(dates, timeSlots)
      const data = await createEvent({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        dates: utc.dates,
        time_slots: utc.time_slots,
        creator_name: form.creatorName.trim() || undefined,
      })
      navigate(`/event/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <h1>Create Event</h1>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit} aria-label="Create event form">
        <div className="form-group">
          <label htmlFor="event-name">Event Name *</label>
          <input id="event-name" value={form.name} onChange={updateForm('name')} required aria-required="true" />
        </div>
        <div className="form-group">
          <label htmlFor="event-desc">Description</label>
          <textarea id="event-desc" value={form.description} onChange={updateForm('description')} rows={3} />
        </div>
        <div className="form-group">
          <label htmlFor="creator-name">Your Name</label>
          <input id="creator-name" value={form.creatorName} onChange={updateForm('creatorName')} />
        </div>
        <div className="form-group">
          <label id="dates-label">Dates ({dates.length} selected)</label>
          <div aria-labelledby="dates-label">
            <Calendar multiple format="YYYY-MM-DD" onChange={handleDateChange} />
          </div>
        </div>
        <fieldset className="form-group">
          <legend>Time Slots</legend>
          <div className="time-slot-row">
            <label htmlFor="start-time" className="sr-only">Start time</label>
            <input id="start-time" type="time" value={form.startTime} onChange={updateForm('startTime')} aria-label="Start time" />
            <span aria-hidden="true">to</span>
            <label htmlFor="end-time" className="sr-only">End time</label>
            <input id="end-time" type="time" value={form.endTime} onChange={updateForm('endTime')} aria-label="End time" />
            <label htmlFor="interval" className="sr-only">Interval</label>
            <select id="interval" value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: Number(e.target.value) }))} aria-label="Time interval">
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            <button type="button" onClick={handleGenerateSlots}>Generate</button>
          </div>
          {timeSlots.length > 0 && (
            <div className="time-slot-list" role="list" aria-label="Generated time slots">
              {timeSlots.map((s) => <span key={s} className="time-tag" role="listitem">{s}</span>)}
            </div>
          )}
        </fieldset>
        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </main>
  )
}

