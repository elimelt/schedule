export interface Event {
  id: string
  name: string
  description?: string
  dates: string[]
  time_slots: string[]
  created_at: string
  creator_name?: string
}

export interface Availability {
  participant_name: string
  available_slots: string[]
}

export interface EventData {
  event: Event
  availabilities: Availability[]
  summary: Record<string, number>
}

export interface CreateEventRequest {
  name: string
  description?: string
  dates: string[]
  time_slots: string[]
  creator_name?: string
}

export interface SubmitAvailabilityRequest {
  participant_name: string
  available_slots: string[]
  password?: string
}

