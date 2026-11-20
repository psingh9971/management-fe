<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Scales an A4 document (default slot) down to fit its container. The PDF export undoes the scale (data-pdf-unscale).

const PAGE_PX = 794 // 210mm at 96dpi
const outer = ref(null)
const inner = ref(null)
const scale = ref(1)
const height = ref(0)
let ro

function measure() {
  if (!outer.value || !inner.value) return
  scale.value = Math.min(1, outer.value.clientWidth / PAGE_PX)
  height.value = inner.value.offsetHeight * scale.value
}

onMounted(() => {
  ro = new ResizeObserver(measure)
  ro.observe(outer.value)
  ro.observe(inner.value)
  measure()
})
onBeforeUnmount(() => ro?.disconnect())

defineExpose({ root: inner })
</script>

<template>
  <div ref="outer" class="preview" :style="{ height: height + 'px' }">
    <div
      ref="inner"
      class="scaled"
      data-pdf-unscale
      :style="{ transform: `scale(${scale})`, width: PAGE_PX + 'px' }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.preview {
  width: 100%;
  overflow: hidden;
}

.scaled {
  transform-origin: top left;
}
</style>
