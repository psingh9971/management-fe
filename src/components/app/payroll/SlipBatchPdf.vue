<script setup>
import { nextTick, ref } from 'vue'
import SalarySlipDocument from './SalarySlipDocument.vue'
import { downloadPdf } from '../../../utils/pdf'
import { withLines } from '../../../services/payrollService'

// Renders slips off-screen and saves them as one multi-page PDF (one slip per page).
const slips = ref([])
const root = ref(null)

async function waitForImages(el) {
  await Promise.all(
    [...el.querySelectorAll('img')].map((img) =>
      img.complete
        ? null
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true })
            img.addEventListener('error', r, { once: true })
          }),
    ),
  )
  await nextTick() // let a failed Zepto logo swap to the text wordmark
}

async function download(list, filename) {
  slips.value = await withLines(list)
  try {
    await nextTick()
    await waitForImages(root.value)
    await downloadPdf(root.value, filename)
  } finally {
    slips.value = []
  }
}

defineExpose({ download })
</script>

<template>
  <div v-if="slips.length" ref="root" class="offscreen" aria-hidden="true">
    <SalarySlipDocument v-for="s in slips" :key="s.id" :slip="s" :print-target="false" />
  </div>
</template>

<style scoped>
.offscreen {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 794px;
  pointer-events: none;
}
</style>
