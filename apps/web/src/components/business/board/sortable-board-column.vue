<script setup lang="ts">
import { Clock, Edit, MoreFilled, WarningFilled } from '@element-plus/icons-vue'
import Sortable, { type SortableEvent } from 'sortablejs'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BoardItem } from '@/api/types'
import { getUserAvatarStyle } from '@/shared/avatar-color'

type BoardStatus = 'todo' | 'doing' | 'done'
interface BoardLaneOption {
  id: string
  label: string
}

const props = defineProps<{
  status: BoardStatus
  laneId: string
  laneOptions: BoardLaneOption[]
  items: BoardItem[]
  hideItems?: boolean
}>()

const emit = defineEmits<{
  open: [item: BoardItem]
  move: [payload: {
    itemId: number
    itemType: 'task' | 'bug'
    status: BoardStatus
    requirementId: number | null
    sourceStatus: BoardStatus
    sourceLaneId: string
    oldIndex?: number
    newIndex?: number
  }]
}>()

const root = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

function requirementIdFromLane(laneId: string) {
  return laneId.startsWith('req-') ? Number(laneId.slice(4)) : null
}

function itemOwnerName(item: BoardItem) {
  return item.assignee_name || (item.item_type === 'bug' ? item.reporter_name : null) || ''
}

function emitMove(item: BoardItem, status: BoardStatus, laneId = props.laneId) {
  emit('move', {
    itemId: item.id,
    itemType: item.item_type,
    status,
    requirementId: requirementIdFromLane(laneId),
    sourceStatus: props.status,
    sourceLaneId: props.laneId,
  })
}

function onEnd(event: SortableEvent) {
  const itemId = Number((event.item as HTMLElement).dataset.itemId)
  const itemType = (event.item as HTMLElement).dataset.itemType as 'task' | 'bug'
  const target = event.to as HTMLElement
  const source = event.from as HTMLElement
  const status = target.dataset.status as BoardStatus
  const laneId = target.dataset.laneId || 'unassigned'
  if (!itemId || !status)
    return
  emit('move', {
    itemId,
    itemType,
    status,
    requirementId: requirementIdFromLane(laneId),
    sourceStatus: source.dataset.status as BoardStatus,
    sourceLaneId: source.dataset.laneId || 'unassigned',
    oldIndex: event.oldDraggableIndex,
    newIndex: event.newDraggableIndex,
  })
}

function handleMoveCommand(item: BoardItem, command: unknown) {
  if (typeof command !== 'string')
    return
  const [kind, value] = command.split(':', 2)
  if (kind === 'status')
    emitMove(item, value as BoardStatus)
  else if (kind === 'lane')
    emitMove(item, props.status, value)
}

onMounted(() => {
  if (!root.value)
    return
  sortable = Sortable.create(root.value, {
    group: 'pongcode-board',
    draggable: '[data-board-item]',
    handle: '[data-board-item]',
    filter: '[data-card-action], [data-board-column-placeholder]',
    preventOnFilter: false,
    animation: 220,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ghostClass: 'board-drag-ghost',
    chosenClass: 'board-drag-chosen',
    dragClass: 'board-drag-active',
    fallbackClass: 'board-drag-fallback',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    emptyInsertThreshold: 80,
    delayOnTouchOnly: true,
    delay: 180,
    touchStartThreshold: 4,
    onEnd,
  })
})

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})

const statusOptions: Array<{ label: string; value: BoardStatus }> = [
  { label: '移到待处理', value: 'todo' },
  { label: '移到进行中', value: 'doing' },
  { label: '移到已完成', value: 'done' },
]
</script>

<template>
  <div
    ref="root"
    data-testid="board-column"
    class="flex h-full min-h-[120px] flex-col gap-2 p-1"
    :data-status="status"
    :data-lane-id="laneId"
    :aria-label="`${status} 工作项列表`"
  >
    <template v-if="!hideItems">
      <article
        v-for="item in items"
        :key="`${item.item_type}-${item.id}`"
        data-board-item
        class="grid cursor-grab gap-2.5 rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-3 transition-[border-color,box-shadow,opacity] duration-[160ms] hover:border-[color-mix(in_srgb,var(--pc-action)_45%,var(--pc-border))] active:cursor-grabbing data-[bug=true]:border-l-[3px] data-[bug=true]:border-l-[var(--pc-danger)]"
        :data-bug="item.item_type === 'bug' || undefined"
        data-testid="board-item"
        :data-item-id="item.id"
        :data-item-type="item.item_type"
        tabindex="0"
        role="button"
        title="拖动卡片可移动，双击打开详情"
        @dblclick="emit('open', item)"
        @keydown.enter="emit('open', item)"
      >
        <header class="flex min-w-0 items-center justify-between gap-2">
          <span class="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[var(--pc-text-muted)]">
            <el-icon v-if="item.item_type === 'bug'"><WarningFilled /></el-icon>
            {{ item.item_code || (item.item_type === 'bug' ? `BUG-${item.id}` : `TASK-${item.id}`) }}
          </span>
          <div class="flex items-center gap-0.5">
            <button
              data-card-action
              class="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)]"
              type="button"
              aria-label="编辑工作项"
              title="编辑工作项"
              @click.stop="emit('open', item)"
            >
              <el-icon><Edit /></el-icon>
            </button>
            <el-dropdown trigger="click" @command="handleMoveCommand(item, $event)">
              <button
                data-testid="board-item-move-button"
                data-card-action
                class="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]"
                type="button"
                aria-label="移动工作项"
                @click.stop
              >
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    移动到状态
                  </el-dropdown-item>
                  <el-dropdown-item v-for="option in statusOptions" :key="option.value" :command="`status:${option.value}`" :disabled="option.value === status">
                    {{ option.label }}
                  </el-dropdown-item>
                  <el-dropdown-item disabled divided>
                    移动到需求
                  </el-dropdown-item>
                  <el-dropdown-item v-for="lane in laneOptions" :key="lane.id" :command="`lane:${lane.id}`" :disabled="lane.id === laneId">
                    {{ lane.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </header>
        <h4 class="m-0 text-sm leading-[1.4] font-semibold text-[var(--pc-text)]">{{ item.title }}</h4>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--pc-text-secondary)]">
          <span
            class="inline-flex items-center gap-[3px] font-semibold text-[var(--pc-action)] data-[severity=true]:text-[var(--pc-danger)]"
            :data-severity="item.item_type === 'bug' || undefined"
          >
            {{ item.item_type === 'bug' ? `S${item.severity}` : `P${item.priority}` }}
          </span>
          <span class="inline-flex items-center gap-1">
            <el-avatar
              :size="18"
              class="shrink-0 !inline-flex !items-center !justify-center !text-center !text-[9px] !leading-none font-semibold"
              :style="getUserAvatarStyle(itemOwnerName(item))"
            >
              {{ itemOwnerName(item).slice(0, 1).toUpperCase() || '?' }}
            </el-avatar>
            {{ itemOwnerName(item) || '未分配' }}
          </span>
          <span v-if="item.time_spent" class="inline-flex items-center gap-[3px]">
            <el-icon><Clock /></el-icon>{{ item.time_spent }}h
          </span>
        </div>
      </article>
    </template>

    <div
      v-if="hideItems && items.length"
      data-board-column-placeholder
      class="grid min-h-[76px] flex-1 place-items-center text-xs text-[var(--pc-text-muted)]"
    >
      已隐藏 {{ items.length }} 项
    </div>
    <div
      v-else-if="!items.length"
      data-board-column-placeholder
      class="grid min-h-[76px] flex-1 place-items-center text-xs text-[var(--pc-text-muted)]"
    >
      暂无
    </div>
  </div>
</template>
