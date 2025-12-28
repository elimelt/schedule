import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'react-multi-date-picker'
import { createEvent } from './api'
import { generateTimeSlots } from './utils'

export default function CreateEvent() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    creatorName: '',
    startTime: '09:00',
    endTime: '17:00',
    interval: 30,
  })
  const [dates, setDates] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateForm = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleDateChange = (selected) =>
    setDates(selected.map((d) => d.format('YYYY-MM-DD')).sort())

  const handleGenerateSlots = () =>
    setTimeSlots(generateTimeSlots(form.startTime, form.endTime, form.interval))

  const validate = () => {
    if (!form.name.trim()) return 'Event name is required'
    if (!dates.length) return 'At least one date is required'
    if (!timeSlots.length) return 'Please generate time slots'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return setError(err)

    setLoading(true)
    setError(null)
    try {
      const data = await createEvent({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        dates,
        time_slots: timeSlots,
        creator_name: form.creatorName.trim() || undefined,
      })
      navigate(`/event/${data.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Create Event</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Event Name *</label>
          <input value={form.name} onChange={updateForm('name')} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={updateForm('description')} rows={3} />
        </div>
        <div className="form-group">
          <label>Your Name</label>
          <input value={form.creatorName} onChange={updateForm('creatorName')} />
        </div>
        <div className="form-group">
          <label>Dates ({dates.length} selected)</label>
          <Calendar multiple format="YYYY-MM-DD" onChange={handleDateChange} />
        </div>
        <div className="form-group">
          <label>Time Slots</label>
          <div className="time-slot-row">
            <input type="time" value={form.startTime} onChange={updateForm('startTime')} />
            <span>to</span>
            <input type="time" value={form.endTime} onChange={updateForm('endTime')} />
            <select
              value={form.interval}
              onChange={(e) => setForm((f) => ({ ...f, interval: Number(e.target.value) }))}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            <button type="button" onClick={handleGenerateSlots}>Generate</button>
          </div>
          {timeSlots.length > 0 && (
            <div className="time-slot-list">
              {timeSlots.map((s) => <span key={s} className="time-tag">{s}</span>)}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}
