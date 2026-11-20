<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SlipBatchPdf from '../../components/app/payroll/SlipBatchPdf.vue'
import { listAllEmployees } from '../../services/employeeService'
import { listEmployeeSlips, mapLimit } from '../../services/payrollService'
import { formatINR, initials } from '../../utils/format'
import { currentMonth, formatMonth } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()

const employees = ref([])
const slips = ref([])
const loading = ref(true)
const error = ref('')
const failures = ref(0)
const listSupported = ref(true)

const employeeId = ref(String(route.query.employee || ''))
const month = ref('')
const search = ref('')
const batch = ref(null)
const downloading = ref(false)

const employeeOptions = computed(() => employees.value.map((e) => ({ value: e.id, label: `${e.fullName} (${e.code})` })))
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return slips.value
    .filter((s) => !employeeId.value || s.employeeId === employeeId.value)
    .filter((s) => !month.value || s.month === month.value)
    .filter((s) => !q || [s.employee.name, s.employee.code, s.slipNo].some((v) => String(v || '').toLowerCase().includes(q)))
})
const employeeName = computed(() => employees.value.find((e) => e.id === employeeId.value)?.fullName || '')

async function load() {
  loading.value = true
  error.value = ''
  failures.value = 0
  try {
    employees.value = await listAllEmployees()
    const all = []
    const results = await mapLimit(employees.value, 5, (e) => listEmployeeSlips(e))
    results.forEach((r) => {
      if (!r.ok) return failures.value++
      if (!r.value.supported) listSupported.value = false
      all.push(...r.value.slips)
    })
    slips.value = all.sort(
      (a, b) => String(b.month).localeCompare(String(a.month)) || a.employee.name.localeCompare(b.employee.name),
    )
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function downloadShown() {
  downloading.value = true
  try {
    const label = employeeName.value || (month.value ? formatMonth(month.value) : 'all')
    await batch.value.download(shown.value, `Salary slips - ${label}.pdf`)
    toast(`${shown.value.length} slips downloaded`)
  } catch (e) {
    console.error(e)
    toast('Could not create the PDF', 'error')
  } finally {
    downloading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <RouterLink to="/payroll" class="back">← Payroll</RouterLink>

    <div class="ui-page-head">
      <div>
        <h1>Salary slips{{ employeeName ? ` — ${employeeName}` : '' }}</h1>
        <p class="ui-muted">Every generated slip, ready to view or download.</p>
      </div>
      <div class="ui-actions">
        <button class="btn btn-primary" :disabled="downloading || !shown.length" @click="downloadShown">
          {{ downloading ? 'Preparing PDF…' : `Download ${shown.length || ''} as PDF` }}
        </button>
      </div>
    </div>

    <div class="ui-toolbar">
      <input v-model="search" class="ui-input ui-search" type="search" placeholder="Search by name, code or slip no…" />
      <select v-model="employeeId" class="ui-input" aria-label="Employee">
        <option value="">All employees</option>
        <option v-for="o in employeeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-model="month" type="month" class="ui-input" :max="currentMonth()" aria-label="Month" />
      <button v-if="month" class="btn btn-ghost btn-sm" @click="month = ''">All months</button>
    </div>

    <p v-if="!loading && !listSupported" class="ui-hint warn">
      The server doesn't list salary slips yet, so only slips generated in this browser session appear here.
    </p>
    <p v-if="failures" class="ui-hint warn">Couldn't load slips for {{ failures }} employee(s).</p>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>Couldn't load salary slips</strong>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!shown.length" class="ui-card ui-empty">
      <strong>No salary slips found</strong>
      <p>Generate slips from the payroll page.</p>
      <RouterLink to="/payroll" class="btn btn-primary btn-sm cta">Go to payroll</RouterLink>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Month</th>
            <th>Slip no</th>
            <th class="num">Paid days</th>
            <th class="num">Gross</th>
            <th class="num">Net pay</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in shown"
            :key="`${s.employeeId}:${s.id}`"
            class="clickable"
            @click="router.push(`/payroll/slips/${s.employeeId}/${s.id}`)"
          >
            <td>
              <div class="ui-person">
                <span class="ui-avatar">{{ initials(s.employee.name) }}</span>
                <span>
                  <strong>{{ s.employee.name }}</strong>
                  <small>{{ [s.employee.code, s.employee.designation].filter(Boolean).join(' · ') }}</small>
                </span>
              </div>
            </td>
            <td>{{ s.month ? formatMonth(s.month) : '—' }}</td>
            <td class="mono">{{ s.slipNo || '—' }}</td>
            <td class="num">{{ s.paidDays }} / {{ s.daysInMonth }}</td>
            <td class="num">{{ formatINR(s.gross) }}</td>
            <td class="num net">{{ formatINR(s.net) }}</td>
            <td class="num" @click.stop>
              <RouterLink :to="`/payroll/slips/${s.employeeId}/${s.id}?download=1`" class="btn btn-ghost btn-sm">
                Download
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SlipBatchPdf ref="batch" />
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

.warn {
  display: block;
  margin: -6px 0 14px;
  color: var(--warning);
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
}

.net {
  color: var(--text-h);
  font-weight: 700;
}

.cta {
  margin-top: 14px;
  display: inline-flex;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
