<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  width?: string | number
  loading?: boolean
  showFooter?: boolean
  destroyOnClose?: boolean
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  titleTestid?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 'min(92vw, 720px)',
  loading: false,
  showFooter: true,
  destroyOnClose: true,
  closeOnClickModal: false,
  closeOnPressEscape: true,
  titleTestid: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'closed': []
}>()

function beforeClose(done: () => void) {
  if (!props.loading)
    done()
}
</script>

<template>
  <el-dialog
    class="pc-dialog"
    :model-value="modelValue"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="!loading && closeOnClickModal"
    :close-on-press-escape="!loading && closeOnPressEscape"
    :show-close="!loading"
    :before-close="beforeClose"
    append-to-body
    align-center
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <template #header="{ titleId, titleClass }">
      <div class="pc-dialog__heading">
        <h2
          :id="titleId"
          :class="titleClass"
          :data-testid="titleTestid"
          class="pc-dialog__title"
        >
          {{ title }}
        </h2>
        <div v-if="$slots['header-extra']" class="pc-dialog__header-extra">
          <slot name="header-extra" />
        </div>
      </div>
    </template>

    <slot />

    <template v-if="showFooter && $slots.footer" #footer>
      <div class="pc-dialog__footer-actions">
        <slot name="footer" />
      </div>
    </template>
  </el-dialog>
</template>
