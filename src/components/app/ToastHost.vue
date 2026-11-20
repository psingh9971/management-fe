<script setup>
import { toasts } from '../../stores/toast'
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: calc(100vw - 40px);
}

.toast {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 4px solid var(--success);
  color: var(--text-h);
  font-size: 14px;
  box-shadow: var(--shadow);
  animation: slide 0.2s ease;
}

.toast.error {
  border-left-color: var(--danger);
}

@keyframes slide {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
}
</style>
