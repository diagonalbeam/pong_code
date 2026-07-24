import { http } from './client'
import type { WorkbenchResponse } from './types'

export function getWorkbench(startDate: string, endDate: string) {
  return http.get<WorkbenchResponse>('/workbench', {
    params: { start_date: startDate, end_date: endDate },
  })
}
