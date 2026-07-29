<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'danger' | 'warning' | 'action' | 'success'
}>(), {
  tone: 'neutral',
})
</script>

<template>
  <article
    class="stat-card flex min-h-[108px] flex-col rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-4 py-3.5"
    :data-tone="tone"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm leading-5 text-[var(--pc-text-secondary)]">{{ label }}</span>
      <span
        v-if="$slots.icon"
        class="stat-card__icon grid h-8 w-8 shrink-0 place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--stat-accent)_8%,var(--pc-surface))] text-base text-[var(--stat-accent)]"
      >
        <slot name="icon" />
      </span>
    </div>
    <strong class="mt-1 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[26px] leading-none font-semibold tracking-[-0.02em] text-[var(--stat-accent)]">{{ value }}</strong>
    <small v-if="hint" class="mt-1 text-xs leading-4 text-[var(--pc-text-muted)]">{{ hint }}</small>
  </article>
</template>

<style scoped>
.stat-card {
  --stat-accent: var(--pc-text);
}

.stat-card[data-tone='danger'] {
  --stat-accent: var(--pc-danger);
}

.stat-card[data-tone='warning'] {
  --stat-accent: var(--pc-warning);
}

.stat-card[data-tone='action'] {
  --stat-accent: var(--pc-action);
}

.stat-card[data-tone='success'] {
  --stat-accent: var(--pc-success);
}
</style>
