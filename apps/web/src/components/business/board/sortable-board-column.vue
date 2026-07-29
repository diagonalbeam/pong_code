<script setup lang="ts">
import { Document, Edit, MoreFilled, WarningFilled } from '@element-plus/icons-vue'
import Sortable, { type SortableEvent } from 'sortablejs'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BoardItem } from '@/api/types'
import { getUserAvatarStyle } from '@/shared/avatar-color'
import { bugStatusLabels } from '@/shared/bug'
import BoardTimeDropdown from './board-time-dropdown.vue'

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
  view: [item: BoardItem]
  changed: []
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

function openCard(item: BoardItem) {
  if (item.item_type === 'bug')
    emit('view', item)
  else
    emit('open', item)
}

const root = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

function requirementIdFromLane(laneId: string) {
  return laneId.startsWith('req-') ? Number(laneId.slice(4)) : null
}

function itemOwnerName(item: BoardItem) {
  return item.assignee_name || (item.item_type === 'bug' ? item.reporter_name : null) || ''
}

function bugStatusLabel(item: BoardItem) {
  if (item.item_type !== 'bug')
    return ''
  return bugStatusLabels[item.status] || '待处理'
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

function handleSortEnd(event: SortableEvent) {
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
    onStart() {
      document.body.classList.add('is-dragging')
    },
    onEnd(event) {
      document.body.classList.remove('is-dragging')
      handleSortEnd(event)
    },
  })
})

onBeforeUnmount(() => {
  document.body.classList.remove('is-dragging')
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
        class="grid cursor-grab gap-1 rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] px-3 py-2 transition-[border-color,opacity] duration-[160ms] hover:border-[color-mix(in_srgb,var(--pc-action)_45%,var(--pc-border))] active:cursor-grabbing data-[bug=true]:border-l-[3px] data-[bug=true]:border-l-[var(--pc-danger)]"
        :data-bug="item.item_type === 'bug' || undefined"
        data-testid="board-item"
        :data-item-id="item.id"
        :data-item-type="item.item_type"
        tabindex="0"
        role="button"
        title="拖动卡片可移动，双击打开详情"
        @dblclick="openCard(item)"
        @keydown.enter="openCard(item)"
      >
        <header class="flex min-h-5 min-w-0 items-center justify-between gap-2 leading-none">
          <span class="inline-flex min-w-0 items-center gap-1 text-[12px] leading-none font-semibold text-[var(--pc-text)]">
            <el-icon v-if="item.item_type === 'bug'" class="text-[var(--pc-danger)]"><WarningFilled /></el-icon>
            {{ item.item_code || (item.item_type === 'bug' ? `BUG-${item.id}` : `TASK-${item.id}`) }}
          </span>
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              v-if="item.item_type === 'bug'"
              data-card-action
              data-testid="board-bug-view-button"
              class="grid h-5 w-5 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent p-0 text-[13px] text-[var(--pc-text-muted)] hover:bg-[color-mix(in_srgb,var(--pc-danger)_12%,var(--pc-surface))] hover:text-[var(--pc-danger)]"
              type="button"
              aria-label="查看缺陷"
              title="查看"
              @click.stop="emit('view', item)"
            >
              <el-icon><Document /></el-icon>
            </button>
            <button
              data-card-action
              data-testid="board-item-edit-button"
              class="grid h-5 w-5 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent p-0 text-[13px] text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)]"
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
                class="grid h-5 w-5 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent p-0 text-[13px] text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]"
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

        <h4 class="m-0 min-w-0 text-[13px] leading-[1.35] font-normal break-words text-[var(--pc-text)]" style="overflow-wrap: anywhere">
          {{ item.title }}
        </h4>

        <footer class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[var(--pc-border-soft)] pt-1.5 text-[12px] text-[var(--pc-text-secondary)]">
          <span
            class="inline-flex shrink-0 items-center font-semibold text-[var(--pc-action)] data-[severity=true]:text-[var(--pc-danger)]"
            :data-severity="item.item_type === 'bug' || undefined"
          >
            {{ item.item_type === 'bug' ? `S${item.severity}` : `P${item.priority}` }}
          </span>
          <span class="inline-flex min-w-0 items-center gap-1.5">
            <el-avatar
              :size="20"
              class="shrink-0 !inline-flex !items-center !justify-center !text-center !text-[10px] !leading-none font-semibold"
              :style="getUserAvatarStyle(itemOwnerName(item))"
            >
              {{ itemOwnerName(item).slice(0, 1).toUpperCase() || '?' }}
            </el-avatar>
            <span class="truncate">{{ itemOwnerName(item) || '未分配' }}</span>
          </span>
          <span class="mx-0.5 h-3 w-px shrink-0 bg-[var(--pc-border)]" aria-hidden="true" />
          <BoardTimeDropdown :item="item" @changed="emit('changed')" />
          <span
            v-if="item.item_type === 'bug'"
            class="ml-auto inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--pc-danger)_10%,var(--pc-surface))] px-2 py-0.5 text-[11px] font-medium text-[var(--pc-danger)]"
            :aria-label="`缺陷状态：${bugStatusLabel(item)}`"
            :title="`缺陷状态：${bugStatusLabel(item)}`"
          >
            {{ bugStatusLabel(item) }}
          </span>
        </footer>
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
