<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="mb-5 flex min-h-[52px] items-center justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div>
      <h1 class="m-0 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[clamp(22px,2vw,26px)] leading-[1.2] font-semibold tracking-[-0.018em]">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1.5 mb-0 text-sm leading-5 tracking-[-0.01em] text-[var(--pc-text-secondary)]">
        {{ description }}
      </p>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:justify-start">
      <slot />
    </div>
  </header>
</template>
