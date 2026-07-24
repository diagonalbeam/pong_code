<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <article class="flex min-h-[108px] flex-col rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-4 py-3.5">
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm leading-5 text-[var(--pc-text-secondary)]">{{ label }}</span>
      <span
        v-if="$slots.icon"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--pc-action)_8%,var(--pc-surface))] text-base text-[var(--pc-action)]"
      >
        <slot name="icon" />
      </span>
    </div>
    <strong class="mt-1 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[26px] leading-none font-semibold tracking-[-0.02em] text-[var(--pc-text)]">{{ value }}</strong>
    <small v-if="hint" class="mt-1 text-xs leading-4 text-[var(--pc-text-muted)]">{{ hint }}</small>
  </article>
</template>
