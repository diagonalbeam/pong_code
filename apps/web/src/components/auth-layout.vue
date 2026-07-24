<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[var(--pc-page)] px-[17px] py-8">
    <section class="w-full max-w-[440px] rounded-[8px] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-8 max-[480px]:px-[17px] max-[480px]:py-6">
      <div class="mb-8 flex items-center gap-2.5 text-[17px] font-semibold text-[var(--pc-text)]">
        <img src="/branding/pongcode-mark.png" alt="" class="h-10 w-10 object-contain" aria-hidden="true">
        <span>PongCode</span>
      </div>
      <h1 class="m-0 text-[34px] leading-[1.18] font-semibold tracking-[-0.02em] text-[var(--pc-text)]">
        {{ title }}
      </h1>
      <p class="mt-2 mb-6 text-[15px] text-[var(--pc-text-secondary)]">
        {{ description }}
      </p>
      <div data-auth-content>
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
[data-auth-content] :deep(.el-form-item) {
  margin-bottom: 14px;
}

[data-auth-content] :deep(.el-button) {
  width: 100%;
}
</style>
