import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = 'https://blink.tail8ab50a.ts.net:8443/w2m/events'

function getSlotColor(count, totalParticipants) {
  if (count === 0) return '#ff4444'
  if (totalParticipants > 0 && count === totalParticipants) return '#44ff44'
  return '#ffcc00'
}

function EventView() {
  const { eventId } = useParams()
  
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  
  const [participantName, setParticipantName] = useState('')
  const [password, setPassword] = useState('')
  const [selectedSlots, setSelectedSlots] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [hoveredSlot, setHoveredSlot] = useState(null)

  const fetchEventData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/${eventId}`)
      
      if (response.status === 404) {
        setNotFound(true)
        return
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setEventData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEventData()
  }, [eventId])

  const handleSlotClick = (slot) => {
    if (!participantName.trim()) return
    
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slot)) {
        newSet.delete(slot)
      } else {
        newSet.add(slot)
      }
      return newSet
    })
    setSubmitSuccess(false)
  }

  const handleSubmit = async () => {
    if (!participantName.trim()) {
      setSubmitError('Please enter your name')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const body = {
        participant_name: participantName.trim(),
        available_slots: Array.from(selectedSlots),
      }
      if (password.trim()) {
        body.password = password.trim()
      }

      const response = await fetch(`${API_URL}/${eventId}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.status === 403) {
        const data = await response.json()
        throw new Error(data.detail || 'Password required or incorrect')
      }

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.status}`)
      }

      setSubmitSuccess(true)
      await fetchEventData()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getParticipantsForSlot = (slot) => {
    if (!eventData?.availabilities) return []
    return eventData.availabilities
      .filter(a => a.available_slots.includes(slot))
      .map(a => a.participant_name)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  if (loading) {
    return <div className="loading">Loading event...</div>
  }

  if (notFound) {
    return (
      <div className="container">
        <div className="error">Event not found</div>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          The event you're looking for doesn't exist or has been deleted.
        </p>
      </div>
    )
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  const { event, availabilities, summary } = eventData
  const totalParticipants = availabilities?.length || 0

  return (
    <div className="container">
      <div className="event-header">
        <h1>{event.name}</h1>
        {event.description && <p className="event-description">{event.description}</p>}
        {event.creator_name && <p className="event-creator">Created by: {event.creator_name}</p>}
      </div>

      <div className="share-link-section">
        <label>Share Link:</label>
        <div className="share-link-row">
          <input type="text" readOnly value={window.location.href} />
          <button type="button" onClick={copyShareLink}>Copy</button>
        </div>
      </div>

      <div className="section">
        <h3>Availability Grid</h3>
        <div className="legend">
          <span><span className="legend-box" style={{ background: '#ff4444' }}></span> None</span>
          <span><span className="legend-box" style={{ background: '#ffcc00' }}></span> Some</span>
          <span><span className="legend-box" style={{ background: '#44ff44' }}></span> All ({totalParticipants})</span>
        </div>
        
        <div className="availability-grid-wrapper">
          <table className="availability-grid">
            <thead>
              <tr>
                <th></th>
                {event.dates.map(date => (
                  <th key={date}>{date}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {event.time_slots.map(timeSlot => (
                <tr key={timeSlot}>
                  <td className="time-cell">{timeSlot}</td>
                  {event.dates.map(date => {
                    const slot = `${date} ${timeSlot}`
                    const count = summary?.[slot] || 0
                    const isSelected = selectedSlots.has(slot)
                    const participants = getParticipantsForSlot(slot)

                    return (
                      <td
                        key={slot}
                        className={`slot-cell ${isSelected ? 'selected' : ''} ${!participantName.trim() ? 'disabled' : ''}`}
                        style={{ backgroundColor: getSlotColor(count, totalParticipants) }}
                        onClick={() => handleSlotClick(slot)}
                        onMouseEnter={() => setHoveredSlot(slot)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        title={participants.length > 0 ? participants.join(', ') : 'No one available'}
                      >
                        <span className="slot-count">{count}</span>
                        {hoveredSlot === slot && participants.length > 0 && (
                          <div className="slot-tooltip">
                            {participants.join(', ')}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalParticipants > 0 && (
          <div className="participants-legend">
            <h4>Participants:</h4>
            <div className="participant-list">
              {availabilities.map(a => (
                <span key={a.participant_name} className="participant-tag">
                  {a.participant_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Submit Your Availability</h3>

        <div className="form-group">
          <label htmlFor="participantName">Your Name</label>
          <input
            type="text"
            id="participantName"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Enter your name to select time slots"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password (optional)</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Protect your availability with a password"
          />
        </div>

        {participantName.trim() && (
          <p className="instruction">Click on cells above to toggle your availability</p>
        )}

        {selectedSlots.size > 0 && (
          <div className="selected-slots">
            <p>Selected: {selectedSlots.size} slot(s)</p>
          </div>
        )}

        {submitError && <div className="error">{submitError}</div>}
        {submitSuccess && <div className="success">Availability submitted successfully!</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !participantName.trim()}
          className="submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Availability'}
        </button>
      </div>
    </div>
  )
}

export default EventView
