declare module 'react-multi-date-picker' {
  import { ComponentType } from 'react'

  export interface DateObject {
    format(template: string): string
  }

  export interface CalendarProps {
    multiple?: boolean
    format?: string
    onChange?: (dates: DateObject[]) => void
  }

  export const Calendar: ComponentType<CalendarProps>
  export default ComponentType<CalendarProps>
}

