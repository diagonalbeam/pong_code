<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'board' | 'cards' | 'list' | 'table'
  rows?: number
  embedded?: boolean
}>(), {
  variant: 'list',
  rows: 5,
  embedded: false,
})
</script>

<template>
  <div
    class="pc-skeleton"
    :class="[`pc-skeleton--${variant}`, { 'pc-skeleton--embedded': embedded }]"
    role="status"
    aria-live="polite"
    :aria-label="variant === 'board' ? '正在加载看板列表' : '正在加载列表'"
    aria-busy="true"
    data-testid="loading-skeleton"
  >
    <div v-if="variant === 'cards'" class="pc-skeleton__card-grid">
      <article v-for="item in rows" :key="item" class="pc-skeleton__card">
        <div class="flex items-center gap-3">
          <span class="pc-skeleton__block pc-skeleton__icon" />
          <div class="pc-skeleton__stack flex-1">
            <span class="pc-skeleton__block h-4 w-2/5" />
            <span class="pc-skeleton__block h-3 w-3/5" />
          </div>
        </div>
        <span class="pc-skeleton__block h-3 w-full" />
        <span class="pc-skeleton__block h-3 w-4/5" />
        <span class="pc-skeleton__block mt-auto h-8 w-full" />
      </article>
    </div>

    <div v-else-if="variant === 'list'" class="pc-skeleton__list">
      <div v-for="item in rows" :key="item" class="pc-skeleton__list-row">
        <span class="pc-skeleton__block h-9 w-9 shrink-0 rounded-full" />
        <div class="pc-skeleton__stack flex-1">
          <span class="pc-skeleton__block h-4 w-2/5" />
          <span class="pc-skeleton__block h-3 w-3/5" />
        </div>
        <span class="pc-skeleton__block h-6 w-16" />
      </div>
    </div>

    <div v-else-if="variant === 'board'" class="pc-skeleton__board">
      <section class="pc-skeleton__board-heading" data-testid="board-header-skeleton">
        <div class="pc-skeleton__board-heading-main">
          <div class="pc-skeleton__board-heading-copy">
            <div class="flex items-center gap-3">
              <span class="pc-skeleton__block h-8 w-44 max-w-[55vw]" />
              <span class="pc-skeleton__block h-5 w-16 rounded-full" />
            </div>
            <div class="pc-skeleton__board-meta">
              <span class="pc-skeleton__block h-4 w-40 max-w-[45vw]" />
              <span class="pc-skeleton__block h-4 w-14" />
              <span class="pc-skeleton__block h-4 w-20" />
              <span class="pc-skeleton__block h-4 w-20" />
              <span class="pc-skeleton__block h-4 w-16" />
            </div>
          </div>
          <div class="pc-skeleton__board-actions">
            <span class="pc-skeleton__block h-8 w-36" />
            <span class="pc-skeleton__block h-8 w-20" />
            <span class="pc-skeleton__block h-8 w-36" />
          </div>
        </div>
        <div class="mt-4">
          <span class="pc-skeleton__block h-2 w-full rounded-full" />
        </div>
      </section>
      <article v-for="lane in 2" :key="lane" class="pc-skeleton__board-lane">
        <header>
          <span class="pc-skeleton__block h-4 w-44 max-w-[55%]" />
          <span class="pc-skeleton__block h-7 w-20" />
        </header>
        <div class="pc-skeleton__board-columns">
          <section v-for="column in 3" :key="column">
            <span class="pc-skeleton__block mb-3 h-3 w-16" />
            <div v-for="card in 2" :key="card" class="pc-skeleton__board-card">
              <span class="pc-skeleton__block h-4 w-3/5" />
              <span class="pc-skeleton__block h-3 w-full" />
              <span class="pc-skeleton__block h-3 w-4/5" />
            </div>
          </section>
        </div>
      </article>
    </div>

    <div v-else class="pc-skeleton__table">
      <div class="pc-skeleton__table-row pc-skeleton__table-row--head">
        <span v-for="column in 5" :key="column" class="pc-skeleton__block h-3" />
      </div>
      <div v-for="item in rows" :key="item" class="pc-skeleton__table-row">
        <span v-for="column in 5" :key="column" class="pc-skeleton__block h-3" />
      </div>
    </div>

    <span class="sr-only">{{ variant === 'board' ? '看板列表加载中，请稍候' : '列表加载中，请稍候' }}</span>
  </div>
</template>

<style scoped>
.pc-skeleton {
  --pc-skeleton-base: color-mix(in srgb, var(--pc-text) 7%, var(--pc-surface));
  --pc-skeleton-highlight: color-mix(in srgb, var(--pc-text) 2%, var(--pc-surface));
  width: 100%;
}

.pc-skeleton__block {
  display: block;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--pc-radius-sm);
  background: linear-gradient(
    100deg,
    var(--pc-skeleton-base) 30%,
    var(--pc-skeleton-highlight) 42%,
    var(--pc-skeleton-base) 54%
  );
  background-size: 300% 100%;
  animation: pc-skeleton-shimmer 1.45s ease-in-out infinite;
}

.pc-skeleton__stack {
  display: grid;
  gap: 8px;
}

.pc-skeleton__icon {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: var(--pc-radius-md);
}

.pc-skeleton__card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pc-skeleton__card {
  display: flex;
  min-height: 164px;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-card);
  background: var(--pc-surface);
}

.pc-skeleton__list,
.pc-skeleton__table {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-card);
  background: var(--pc-surface);
}

.pc-skeleton__list {
  padding: 0 16px;
}

.pc-skeleton__list-row {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--pc-border-soft);
}

.pc-skeleton__list-row:last-child {
  border-bottom: 0;
}

.pc-skeleton__table-row {
  display: grid;
  min-height: 52px;
  grid-template-columns: 2fr 1fr 1fr 1.2fr 0.7fr;
  align-items: center;
  gap: 28px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--pc-border-soft);
}

.pc-skeleton__table-row:last-child {
  border-bottom: 0;
}

.pc-skeleton__table-row--head {
  min-height: 44px;
  background: var(--pc-surface-soft);
}

.pc-skeleton--embedded .pc-skeleton__list,
.pc-skeleton--embedded .pc-skeleton__table {
  border: 0;
  border-radius: 0;
}

.pc-skeleton__board {
  display: grid;
  gap: 14px;
}

.pc-skeleton__board-heading {
  display: grid;
  gap: 16px;
}

.pc-skeleton__board-heading-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.pc-skeleton__board-heading-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 12px;
}

.pc-skeleton__board-meta,
.pc-skeleton__board-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.pc-skeleton__board-actions {
  flex: none;
  justify-content: flex-end;
  gap: 8px;
}

.pc-skeleton__board-lane > header {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px;
}

.pc-skeleton__board-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 12px;
  overflow-x: auto;
}

.pc-skeleton__board-columns > section {
  padding: 12px;
  border-radius: 12px;
  background: var(--pc-surface-soft);
}

.pc-skeleton__board-card {
  display: grid;
  min-height: 128px;
  gap: 12px;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid var(--pc-border-soft);
  border-radius: 12px;
  background: var(--pc-surface);
}

@keyframes pc-skeleton-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

@media (max-width: 1023px) {
  .pc-skeleton__card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pc-skeleton__board-heading-main {
    flex-direction: column;
  }

  .pc-skeleton__board-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 639px) {
  .pc-skeleton__card-grid {
    grid-template-columns: 1fr;
  }

  .pc-skeleton__table {
    display: grid;
    gap: 12px;
    overflow: visible;
    border: 0;
    background: transparent;
  }

  .pc-skeleton__table-row {
    min-height: 112px;
    grid-template-columns: 1fr 0.55fr;
    gap: 12px;
    border: 1px solid var(--pc-border);
    border-radius: var(--pc-radius-card);
    background: var(--pc-surface);
  }

  .pc-skeleton__table-row--head {
    display: none;
  }

  .pc-skeleton__board-actions {
    width: 100%;
  }

  .pc-skeleton__board-actions > :first-child {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pc-skeleton__block {
    animation: none;
  }
}
</style>
