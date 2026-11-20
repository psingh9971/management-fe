<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocPreview from '../../components/app/docs/DocPreview.vue'
import SalarySlipDocument from '../../components/app/payroll/SalarySlipDocument.vue'
import { getEmployee } from '../../services/employeeService'
import { getEmployeeSlip, slipFileName } from '../../services/payrollService'
import { downloadPdf, printDocument } from '../../utils/pdf'
import { formatINR } from '../../utils/format'
import { formatMonth } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const { employeeId, slipId } = route.params

const slip = ref(null)
const loading = ref(true)
const error = ref('')
const downloading = ref(false)
const previewRef = ref(null)

async function download() {
  if (!slip.value || downloading.value) return
  downloading.value = true
  try {
    await nextTick()
    await downloadPdf(previewRef.value.root, slipFileName(slip.value))
    toast('PDF downloaded')
  } catch (e) {
    console.error(e)
    toast('Could not create the PDF — try Print → Save as PDF', 'error')
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    const employee = await getEmployee(employeeId)
    slip.value = await getEmployeeSlip(employee, slipId)
  } catch (e) {
    error.value = e.status === 404 ? 'not-found' : e.message
  } finally {
    loading.value = false
  }
  if (slip.value && route.query.download) {
    // Drop ?download without a route change (the layout remounts views on any fullPath change).
    window.history.replaceState({ ...window.history.state, current: route.path }, '', route.path)
    setTimeout(download, 400) // let the logos load first
  }
})
</script>

<template>
  <div>
    <RouterLink to="/payroll/slips" class="back">← Salary slips</RouterLink>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>{{ error === 'not-found' ? 'Salary slip not found' : "Couldn't load this salary slip" }}</strong>
      <p v-if="error === 'not-found'">It may have been generated in another session — open it from the salary slips list.</p>
      <p v-else>{{ error }}</p>
    </div>

    <template v-else-if="slip">
      <div class="ui-page-head">
        <div>
          <h1>{{ slip.employee.name }} — {{ slip.month ? formatMonth(slip.month) : 'Salary slip' }}</h1>
          <p class="ui-muted">{{ [slip.slipNo, `Net pay ${formatINR(slip.net)}`].filter(Boolean).join(' · ') }}</p>
        </div>
        <div class="ui-actions">
          <RouterLink :to="`/payroll/slips?employee=${employeeId}`" class="btn btn-ghost">All slips for employee</RouterLink>
          <button class="btn btn-ghost" @click="printDocument">Print</button>
          <button class="btn btn-primary" :disabled="downloading" @click="download">
            {{ downloading ? 'Preparing PDF…' : 'Download PDF' }}
          </button>
        </div>
      </div>

      <p v-if="slip.note" class="ui-muted note">Note: {{ slip.note }}</p>

      <div class="doc-wrap">
        <DocPreview ref="previewRef"><SalarySlipDocument :slip="slip" /></DocPreview>
      </div>

      <details class="raw">
        <summary>Raw API response</summary>
        <pre>{{ JSON.stringify(slip.raw, null, 2) }}</pre>
      </details>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}

.back:hover {
  color: var(--text-h);
}

.note {
  margin: -10px 0 16px;
}

.doc-wrap {
  padding: 20px;
  border-radius: 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  display: flex;
  justify-content: center;
}

.doc-wrap > * {
  max-width: 794px;
}

.raw {
  margin-top: 16px;
  font-size: 13px;
  color: var(--muted);
}

.raw summary {
  cursor: pointer;
}

.raw pre {
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  overflow-x: auto;
  color: var(--text);
  max-height: 360px;
}

@media (max-width: 900px) {
  .doc-wrap {
    padding: 8px;
  }
}
</style>
