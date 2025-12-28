import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'react-multi-date-picker'

const API_URL = 'https://blink.tail8ab50a.ts.net:8443/w2m/events'

function generateTimeSlots(startTime, endTime, intervalMinutes) {
  const slots = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  let currentMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60)
    const mins = currentMinutes % 60
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
    currentMinutes += intervalMinutes
  }

  return slots
}

function CreateEvent() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [dates, setDates] = useState([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [interval, setInterval] = useState(30)
  const [timeSlots, setTimeSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDateChange = (selectedDates) => {
    const formatted = selectedDates
      .map(d => d.format('YYYY-MM-DD'))
      .sort()
    setDates(formatted)
  }

  const handleGenerateSlots = () => {
    if (startTime && endTime) {
      const slots = generateTimeSlots(startTime, endTime, interval)
      setTimeSlots(slots)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (!name.trim()) {
      setError('Event name is required')
      return
    }
    
    if (dates.length === 0) {
      setError('At least one date is required')
      return
    }
    
    if (timeSlots.length === 0) {
      setError('Please generate time slots')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          dates,
          time_slots: timeSlots,
          creator_name: creatorName.trim() || undefined,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`)
      }
      
      const data = await response.json()
      navigate(`/event/${data.id}`)
    } catch (err) {
      setError(err.message)
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
          <label htmlFor="name">Event Name *</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="creatorName">Your Name</label>
          <input
            type="text"
            id="creatorName"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Dates ({dates.length} selected)</label>
          <Calendar
            multiple
            format="YYYY-MM-DD"
            onChange={handleDateChange}
          />
        </div>

        <div className="form-group">
          <label>Time Slots</label>
          <div className="time-slot-row">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span>to</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <select value={interval} onChange={(e) => setInterval(Number(e.target.value))}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            <button type="button" onClick={handleGenerateSlots}>Generate Slots</button>
          </div>
          {timeSlots.length > 0 && (
            <div className="time-slot-list">
              {timeSlots.map(slot => (
                <span key={slot} className="time-tag">{slot}</span>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}

export default CreateEvent

