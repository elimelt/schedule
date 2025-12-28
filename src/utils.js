export const generateTimeSlots = (start, end, interval) => {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const format = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const slots = []
  for (let m = toMinutes(start); m <= toMinutes(end); m += interval) {
    slots.push(format(m))
  }
  return slots
}

export const getSlotColor = (count, total) => {
  if (count === 0) return '#ff4444'
  if (total > 0 && count === total) return '#44ff44'
  return '#ffcc00'
}

