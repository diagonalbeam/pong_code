<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <main class="auth-shell grid min-h-screen place-items-center px-[17px] py-8">
    <div class="auth-aurora auth-aurora--blue" aria-hidden="true" />
    <div class="auth-aurora auth-aurora--cyan" aria-hidden="true" />

    <section class="auth-card relative z-10 w-full max-w-[440px] overflow-hidden rounded-[18px] p-8 max-[480px]:px-[17px] max-[480px]:py-6">
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
.auth-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(ellipse at center, rgb(255 255 255 / 96%) 0, rgb(255 255 255 / 68%) 34%, transparent 64%),
    linear-gradient(145deg, #edf6ff 0%, #fbfdff 38%, #f9fdff 62%, #eafbff 100%);
}

.auth-shell::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(120deg, rgb(255 255 255 / 42%) 8%, transparent 34%),
    linear-gradient(305deg, rgb(255 255 255 / 46%) 5%, transparent 32%);
  content: '';
  pointer-events: none;
}

.auth-aurora {
  position: absolute;
  z-index: -2;
  filter: blur(54px);
  pointer-events: none;
}

.auth-aurora--blue {
  top: -31%;
  left: -19%;
  width: min(82vw, 1180px);
  height: min(68vh, 720px);
  border-radius: 34% 66% 58% 42% / 42% 38% 62% 58%;
  background: radial-gradient(ellipse at 43% 60%, rgb(10 108 204 / 30%) 0, rgb(10 108 204 / 15%) 42%, transparent 72%);
  transform: rotate(-13deg);
  animation: auth-drift-blue 18s ease-in-out infinite alternate;
}

.auth-aurora--cyan {
  right: -36%;
  bottom: -48%;
  width: min(104vw, 1560px);
  height: min(82vh, 880px);
  border-radius: 62% 38% 32% 68% / 54% 58% 42% 46%;
  background:
    linear-gradient(
      132deg,
      transparent 13%,
      rgb(51 193 220 / 7%) 31%,
      rgb(51 193 220 / 28%) 54%,
      rgb(10 108 204 / 9%) 75%,
      transparent 91%
    );
  transform: rotate(-17deg);
  animation: auth-drift-cyan 22s ease-in-out -7s infinite alternate;
}

.auth-card {
  border: 1px solid rgb(255 255 255 / 72%);
  background: rgb(255 255 255 / 62%);
  box-shadow:
    0 24px 70px rgb(52 64 112 / 16%),
    0 2px 10px rgb(52 64 112 / 7%),
    inset 0 1px 0 rgb(255 255 255 / 78%);
  backdrop-filter: blur(28px) saturate(165%);
  -webkit-backdrop-filter: blur(28px) saturate(165%);
}

.auth-card::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(145deg, rgb(255 255 255 / 34%), transparent 45%);
  content: '';
  pointer-events: none;
}

[data-auth-content] :deep(.el-input__wrapper) {
  background: rgb(255 255 255 / 58%);
  box-shadow:
    0 0 0 1px rgb(112 120 148 / 22%) inset,
    0 1px 2px rgb(43 52 88 / 4%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

[data-auth-content] :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgb(80 96 148 / 36%) inset;
}

[data-auth-content] :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--pc-action) inset,
    0 0 0 3px rgb(0 102 204 / 10%);
}

[data-auth-content] :deep(.el-form-item) {
  margin-bottom: 14px;
}

[data-auth-content] :deep(.el-button) {
  width: 100%;
}

@keyframes auth-drift-blue {
  from {
    transform: translate3d(-1.5%, -1%, 0) rotate(-13deg) scale(1);
  }

  to {
    transform: translate3d(2%, 1.5%, 0) rotate(-10deg) scale(1.04);
  }
}

@keyframes auth-drift-cyan {
  from {
    transform: translate3d(1%, 1.5%, 0) rotate(-17deg) scale(1);
  }

  to {
    transform: translate3d(-2%, -1%, 0) rotate(-14deg) scale(1.05);
  }
}

:global(.dark) .auth-shell {
  background:
    radial-gradient(ellipse at center, rgb(19 30 40 / 76%) 0, transparent 62%),
    linear-gradient(145deg, #0d1d2b 0%, #121c26 48%, #0b2930 100%);
}

:global(.dark) .auth-shell::before {
  opacity: 0.25;
}

:global(.dark) .auth-card {
  border-color: rgb(255 255 255 / 16%);
  background: rgb(31 31 37 / 58%);
  box-shadow:
    0 28px 80px rgb(0 0 0 / 34%),
    inset 0 1px 0 rgb(255 255 255 / 12%);
}

:global(.dark) [data-auth-content] :deep(.el-input__wrapper) {
  background: rgb(24 24 29 / 54%);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 14%) inset;
}

@media (max-width: 640px) {
  .auth-aurora {
    filter: blur(42px);
  }

  .auth-aurora--blue {
    top: -12%;
    left: -72%;
    width: 180vw;
    height: 48vh;
  }

  .auth-aurora--cyan {
    right: -104%;
    bottom: -24%;
    width: 235vw;
    height: 58vh;
  }

  .auth-card {
    border-radius: 16px;
    backdrop-filter: blur(22px) saturate(155%);
    -webkit-backdrop-filter: blur(22px) saturate(155%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-aurora {
    animation: none;
  }
}
</style>
