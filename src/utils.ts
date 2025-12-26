export const generateTimeSlots = (start: string, end: string, interval: number): string[] => {
  const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const format = (mins: number): string => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const slots: string[] = []
  for (let m = toMinutes(start); m <= toMinutes(end); m += interval) {
    slots.push(format(m))
  }
  return slots
}

export const getSlotColor = (count: number, total: number): string => {
  if (count === 0) return '#ff4444'
  if (total > 0 && count === total) return '#44ff44'
  return '#ffcc00'
}

export const buildSlotId = (date: string, time: string): string =>
  `${date}T${time}:00Z`

export const parseSlotId = (slot: string): { date: string; time: string } => {
  const [date, rest] = slot.split('T')
  const time = rest.replace(':00Z', '')
  return { date, time }
}

export const formatDateLocal = (utcSlot: string): string =>
  new Date(utcSlot).toLocaleDateString(undefined, { dateStyle: 'medium' })

export const formatTimeLocal = (utcSlot: string): string =>
  new Date(utcSlot).toLocaleTimeString(undefined, { timeStyle: 'short' })

export const formatSlotLocal = (utcSlot: string): string =>
  new Date(utcSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const localTimeToUtc = (date: string, time: string): { date: string; time: string } => {
  const local = new Date(`${date}T${time}:00`)
  const utcDate = local.toISOString().slice(0, 10)
  const utcTime = local.toISOString().slice(11, 16)
  return { date: utcDate, time: utcTime }
}

export const convertSlotsToUtc = (
  dates: string[],
  timeSlots: string[]
): { dates: string[]; time_slots: string[] } => {
  const utcSlots = new Map<string, Set<string>>()

  for (const date of dates) {
    for (const time of timeSlots) {
      const utc = localTimeToUtc(date, time)
      if (!utcSlots.has(utc.date)) utcSlots.set(utc.date, new Set())
      utcSlots.get(utc.date)!.add(utc.time)
    }
  }

  const allTimes = new Set<string>()
  utcSlots.forEach((times) => times.forEach((t) => allTimes.add(t)))

  return {
    dates: [...utcSlots.keys()].sort(),
    time_slots: [...allTimes].sort(),
  }
}

