import { useState, useEffect } from 'react'

const API_URL = 'https://blink.tail8ab50a.ts.net:8443/visitors'

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function VisitorItem({ visitor, showTimestamp }) {
  const timestamp = showTimestamp || visitor.connected_at || visitor.timestamp
  return (
    <div className="visitor-item">
      <span className="ip">{visitor.ip}</span>
      <span className="location">
        {visitor.location.city !== 'Unknown' 
          ? `${visitor.location.city}, ${visitor.location.country}`
          : visitor.location.country}
      </span>
      <span className="time">{formatTime(timestamp)}</span>
    </div>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const response = await fetch(API_URL, {
          headers: {
            'Accept': '*/*',
            'Origin': 'https://elimelt.com',
            'Referer': 'https://elimelt.com/',
          }
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchVisitors()
    const interval = setInterval(fetchVisitors, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="loading">Loading visitor data...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="container">
      <h1>Visitor Tracker</h1>
      
      <div className="stats">
        <div className="stat-card">
          <h2>{data.active_count}</h2>
          <p>Active Visitors</p>
        </div>
        <div className="stat-card">
          <h2>{data.recent_visits?.length || 0}</h2>
          <p>Recent Visits</p>
        </div>
      </div>

      {data.active_visitors?.length > 0 && (
        <div className="section">
          <h3>🟢 Active Visitors</h3>
          <div className="visitor-list">
            {data.active_visitors.map((visitor, idx) => (
              <VisitorItem key={idx} visitor={visitor} />
            ))}
          </div>
        </div>
      )}

      {data.recent_visits?.length > 0 && (
        <div className="section">
          <h3>📊 Recent Visits</h3>
          <div className="visitor-list">
            {data.recent_visits.slice(0, 50).map((visit, idx) => (
              <VisitorItem key={idx} visitor={visit} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

