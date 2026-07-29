export type StatusType = 'success' | 'warning' | 'danger' | 'info'

export function getStatusType(status: string): StatusType {
  if (['done', 'completed', 'closed'].includes(status))
    return 'success'
  if (['doing', 'active', 'in_progress', 'fixed', 'resolved', 'testing'].includes(status))
    return 'warning'
  if (status === 'rejected')
    return 'danger'
  return 'info'
}
