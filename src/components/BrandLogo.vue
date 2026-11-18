<script setup>
import { ref } from 'vue'

// JP Enterprises logo from public/. Header/hero use /logo2.png (icon), footer uses /logo.png (full).
// Until it exists, the text wordmark is shown.
defineProps({
  height: { type: Number, default: null },
  src: { type: String, default: '/logo.png' },
})
const failed = ref(false)
</script>

<template>
  <img
    v-if="!failed"
    :src="src"
    alt="JP Enterprises"
    class="logo-img"
    :style="height ? { height: height + 'px' } : null"
    @error="failed = true"
  />
  <span v-else class="wordmark">
    <span class="jp">JP</span><span class="x">&times;</span><span class="zepto">ZEPTO</span>
  </span>
</template>

<style scoped>
.logo-img {
  display: block;
  width: auto;
  object-fit: contain;
}

.wordmark {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.jp {
  color: var(--text-h);
}

.x {
  color: var(--accent);
  font-size: 18px;
}

.zepto {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
