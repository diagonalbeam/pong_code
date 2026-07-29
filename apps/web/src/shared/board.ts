import type { BoardItem, Swimlane } from '@/api/types'

export type BoardStatus = 'todo' | 'doing' | 'done'
export type BoardBugStatus = 'open' | 'in_progress' | 'closed'

export const BOARD_HIDE_COMPLETED_STORAGE_KEY = 'pongcode:board:hide-completed'
export const BOARD_COLLAPSED_SWIMLANES_STORAGE_PREFIX = 'pongcode:board:collapsed-swimlanes:v1'

export const boardBugStatus: Record<BoardStatus, BoardBugStatus> = {
  todo: 'open',
  doing: 'in_progress',
  done: 'closed',
}

export function boardLaneId(lane: Swimlane) {
  return lane.requirement ? `req-${lane.requirement.id}` : 'unassigned'
}

export function boardRequirementId(laneId: string) {
  return laneId.startsWith('req-') ? Number(laneId.slice(4)) : null
}

export function boardCollapsedStorageKey(
  userId: number | 'anonymous',
  projectId: number,
  sprintId: number,
) {
  return `${BOARD_COLLAPSED_SWIMLANES_STORAGE_PREFIX}:${userId}:${projectId}:${sprintId}`
}

/** 泳道没有待处理、进行中工作项时视为非活跃，默认折叠。 */
export function isSwimlaneInactive(lane: Swimlane) {
  return lane.todo.length === 0 && lane.doing.length === 0
}

export function calculateSwimlaneProgress(lane: Swimlane) {
  const items = lane.todo.length + lane.doing.length + lane.done.length
  return items ? Math.round(lane.done.length / items * 100) : 0
}

export function calculateBoardTotals(swimlanes: Swimlane[]) {
  const items: BoardItem[] = swimlanes.flatMap(lane => [...lane.todo, ...lane.doing, ...lane.done])
  const done = swimlanes.reduce((sum, lane) => sum + lane.done.length, 0)
  return {
    items: items.length,
    done,
    hours: Number(
      items.reduce((sum, item) => sum + Number(item.time_spent || 0), 0).toFixed(1),
    ),
    progress: items.length ? Math.round(done / items.length * 100) : 0,
  }
}
