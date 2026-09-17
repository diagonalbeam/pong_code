<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  id: number | string
  entity?: string
  size?: 'sm' | 'md'
}>(), {
  entity: '对象',
  size: 'sm',
})

const idText = computed(() => String(props.id))
</script>

<template>
  <span
    class="pc-id-badge"
    :class="`pc-id-badge--${size}`"
    :aria-label="`${entity} ID ${idText}`"
  >
    <span aria-hidden="true" class="pc-id-badge__label">ID</span>
    <span aria-hidden="true" class="pc-id-badge__value">{{ idText }}</span>
  </span>
</template>

<style scoped>
.pc-id-badge {
  display: inline-flex;
  height: 22px;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--pc-action) 14%, var(--pc-border-soft));
  border-radius: var(--pc-radius-pill);
  background: color-mix(in srgb, var(--pc-action) 4%, var(--pc-surface));
  padding: 0 7px;
  white-space: nowrap;
}

.pc-id-badge__label {
  color: var(--pc-action);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.pc-id-badge__value {
  color: var(--pc-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.pc-id-badge--md {
  height: 26px;
  gap: 5px;
  border-radius: var(--pc-radius-pill);
  padding: 0 9px;
}

.pc-id-badge--md .pc-id-badge__label {
  font-size: 10px;
}

.pc-id-badge--md .pc-id-badge__value {
  font-size: 12px;
}
</style>
