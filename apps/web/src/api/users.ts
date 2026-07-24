import { http } from './client'
import type { User } from './types'

export function getUsers() {
  return http
    .get<User[]>('/users/search')
    .then(response => response.data)
}
