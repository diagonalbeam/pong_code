import { describe, expect, it } from 'vitest'
import type { BoardItem, Swimlane } from '@/api/types'
import {
  boardBugStatus,
  boardCollapsedStorageKey,
  boardLaneId,
  boardRequirementId,
  calculateBoardTotals,
  calculateSwimlaneProgress,
} from './board'

function task(id: number, timeSpent = 0): BoardItem {
  return {
    id,
    item_type: 'task',
    item_code: `TASK-${id}`,
    title: `任务 ${id}`,
    description: null,
    status: 'todo',
    priority: 3,
    time_estimate: 0,
    time_spent: timeSpent,
    assignee_id: null,
    assignee_name: null,
    project_id: 1,
    sprint_id: 1,
    requirement_id: null,
    requirement_title: null,
  }
}

describe('看板共享规则', () => {
  it('沿用旧版泳道偏好键', () => {
    expect(boardCollapsedStorageKey(7, 11, 13))
      .toBe('pongcode:board:collapsed-swimlanes:v1:7:11:13')
  })

  it('在泳道标识和需求 ID 之间正确转换', () => {
    const lane = {
      requirement: { id: 9 },
    } as Swimlane
    expect(boardLaneId(lane)).toBe('req-9')
    expect(boardRequirementId('req-9')).toBe(9)
    expect(boardRequirementId('unassigned')).toBeNull()
  })

  it('使用既有缺陷状态映射', () => {
    expect(boardBugStatus).toEqual({
      todo: 'open',
      doing: 'in_progress',
      done: 'closed',
    })
  })

  it('按所有泳道统计完成率与工时', () => {
    const lanes = [{
      requirement: null,
      todo: [task(1, 1.5)],
      doing: [task(2, 2)],
      done: [task(3, 0.5), task(4, 1)],
    }] as Swimlane[]
    expect(calculateBoardTotals(lanes)).toEqual({
      items: 4,
      done: 2,
      hours: 5,
      progress: 50,
    })
  })

  it('按单条泳道统计完成率', () => {
    const lane = {
      requirement: null,
      todo: [task(1)],
      doing: [task(2)],
      done: [task(3), task(4)],
    } as Swimlane

    expect(calculateSwimlaneProgress(lane)).toBe(50)
    expect(calculateSwimlaneProgress({
      requirement: null,
      todo: [],
      doing: [],
      done: [],
    } as Swimlane)).toBe(0)
  })
})
