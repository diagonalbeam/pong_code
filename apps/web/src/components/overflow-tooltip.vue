<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

const props = withDefaults(defineProps<{
  content: string
  testid?: string
}>(), {
  testid: undefined,
})

const trigger = ref<HTMLElement | null>(null)
const overflowing = ref(false)
let resizeObserver: ResizeObserver | undefined

function measureOverflow() {
  const element = trigger.value
  overflowing.value = Boolean(
    element
    && props.content
    && element.scrollWidth > element.clientWidth + 1,
  )
}

function scheduleMeasurement() {
  void nextTick(measureOverflow)
}

onMounted(() => {
  scheduleMeasurement()
  if (typeof ResizeObserver !== 'undefined' && trigger.value) {
    resizeObserver = new ResizeObserver(measureOverflow)
    resizeObserver.observe(trigger.value)
  }
})

onUpdated(scheduleMeasurement)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <el-tooltip
    :content="content"
    :disabled="!overflowing"
    placement="top"
    :show-after="300"
    popper-class="pc-overflow-tooltip"
  >
    <span
      ref="trigger"
      class="block min-w-0 truncate"
      :data-testid="testid"
      :data-tooltip-content="content"
      :data-overflowing="String(overflowing)"
    >
      {{ content }}
    </span>
  </el-tooltip>
</template>

<style>
.pc-overflow-tooltip {
  max-width: min(560px, calc(100vw - 32px));
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
