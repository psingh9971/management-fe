<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SlipBatchPdf from '../../components/app/payroll/SlipBatchPdf.vue'
import { listAllEmployees } from '../../services/employeeService'
import { generateSlip, listEmployeeSlips, mapLimit } from '../../services/payrollService'
import { formatINR, initials } from '../../utils/format'
import { currentMonth, formatMonth } from '../../utils/date'
import { toast } from '../../stores/toast'

// Salary is usually generated for the month that just ended.
function previousMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const month = ref(previousMonth())
const allowIncomplete = ref(false)
const note = ref('')
const search = ref('')

const employees = ref([])
const loading = ref(true)
const error = ref('')
const listSupported = ref(true)

// Per employee: { slip, slipsLoading, generating, error }
const rows = reactive({})
const selected = ref(new Set())
const running = ref(false)
const progress = reactive({ done: 0, total: 0 })
const batch = ref(null)
const downloading = ref(false)

const isCurrentMonth = computed(() => month.value === currentMonth())
const isFuture = computed(() => month.value > currentMonth())
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return employees.value.filter(
    (e) => !q || [e.fullName, e.code, e.designation].some((v) => v?.toLowerCase().includes(q)),
  )
})
const generated = computed(() => employees.value.map((e) => rows[e.id]?.slip).filter(Boolean))
const pending = computed(() => shown.value.filter((e) => !rows[e.id]?.slip))
const totals = computed(() => ({
  net: generated.value.reduce((s, x) => s + (Number(x.net) || 0), 0),
  gross: generated.value.reduce((s, x) => s + (Number(x.gross) || 0), 0),
}))
const allPendingSelected = computed(() => pending.value.length > 0 && pending.value.every((e) => selected.value.has(e.id)))

const row = (id) => (rows[id] ||= { slip: null, slipsLoading: false, generating: false, error: '' })

async function loadEmployees() {
  loading.value = true
  error.value = ''
  try {
    employees.value = await listAllEmployees({ status: 'active' })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
  if (!error.value) loadSlips()
}

// Which employees already have a slip for this month (needs the list endpoint).
async function loadSlips() {
  selected.value = new Set()
  for (const e of employees.value) Object.assign(row(e.id), { slip: null, error: '', slipsLoading: true })
  await mapLimit(employees.value, 5, async (e) => {
    try {
      const { supported, slips } = await listEmployeeSlips(e)
      if (!supported) listSupported.value = false
      row(e.id).slip = slips.find((s) => s.month === month.value) || null
    } catch (err) {
      row(e.id).error = err.message
    } finally {
      row(e.id).slipsLoading = false
    }
  })
}

watch(month, (m) => {
  allowIncomplete.value = m === currentMonth()
  if (m && employees.value.length) loadSlips()
})

function toggle(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}

function toggleAll() {
  selected.value = allPendingSelected.value ? new Set() : new Set(pending.value.map((e) => e.id))
}

async function generateFor(list) {
  if (!list.length) return
  running.value = true
  Object.assign(progress, { done: 0, total: list.length })
  const opts = { month: month.value, allowIncompleteMonth: allowIncomplete.value, note: note.value }
  for (const e of list) Object.assign(row(e.id), { generating: true, error: '' })

  const results = await mapLimit(
    list,
    3,
    (e) => generateSlip(e, opts),
    (e, res) => {
      progress.done++
      const r = row(e.id)
      r.generating = false
      if (res.ok) r.slip = res.value
      else r.error = res.error.message || 'Failed'
    },
  )
  running.value = false
  selected.value = new Set([...selected.value].filter((id) => !rows[id]?.slip))

  const ok = results.filter((r) => r.ok).length
  const failed = results.length - ok
  if (failed && ok) toast(`${ok} slip(s) generated, ${failed} failed — see the table`, 'error')
  else if (failed) toast(list.length === 1 ? results[0].error.message : `${failed} slip(s) failed — see the table`, 'error')
  else toast(ok === 1 ? `Salary slip generated for ${list[0].fullName}` : `${ok} salary slips generated`)
}

const generateSelected = () => generateFor(employees.value.filter((e) => selected.value.has(e.id)))

async function downloadAll() {
  downloading.value = true
  try {
    await batch.value.download(generated.value, `Salary slips - ${formatMonth(month.value)}.pdf`)
    toast(`${generated.value.length} slips downloaded`)
  } catch (e) {
    console.error(e)
    toast('Could not create the PDF', 'error')
  } finally {
    downloading.value = false
  }
}

onMounted(loadEmployees)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Payroll</h1>
        <p class="ui-muted">
          Generate salary slips for {{ formatMonth(month) }}. Pay is calculated from each employee's assigned salary
          structure.
        </p>
      </div>
      <div class="ui-actions">
        <RouterLink to="/payroll/slips" class="btn btn-ghost">All salary slips</RouterLink>
      </div>
    </div>

    <div class="ui-card options">
      <label class="ui-field month-field">
        <span class="ui-label">Month</span>
        <input v-model="month" type="month" class="ui-input" :max="currentMonth()" />
      </label>
      <label class="ui-field note-field">
        <span class="ui-label">Note <small class="ui-hint">optional, added to every slip generated now</small></span>
        <input v-model="note" class="ui-input" maxlength="250" placeholder="e.g. Includes Diwali bonus" />
      </label>
      <label class="ui-check incomplete">
        <input v-model="allowIncomplete" type="checkbox" />
        <span>
          Allow incomplete month
          <small>{{ isCurrentMonth ? 'This month hasn’t ended yet — needed to generate now.' : 'Only needed for a month that hasn’t ended.' }}</small>
        </span>
      </label>
    </div>

    <p v-if="isFuture" class="ui-form-error">You can't generate slips for a future month.</p>

    <div v-if="loading" class="ui-card ui-empty">Loading employees…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>Couldn't load employees</strong>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <div class="ui-tiles">
        <div class="ui-tile">
          <span class="ui-tile-label">Slips generated</span>
          <span class="ui-tile-value">{{ generated.length }} / {{ employees.length }}</span>
          <span class="ui-tile-sub">{{ listSupported ? 'Active employees' : 'This session only' }}</span>
        </div>
        <div class="ui-tile">
          <span class="ui-tile-label">Gross</span>
          <span class="ui-tile-value">{{ formatINR(totals.gross) }}</span>
          <span class="ui-tile-sub">Across generated slips</span>
        </div>
        <div class="ui-tile">
          <span class="ui-tile-label">Net payable</span>
          <span class="ui-tile-value">{{ formatINR(totals.net) }}</span>
          <span class="ui-tile-sub">Total take-home</span>
        </div>
      </div>

      <p v-if="!listSupported" class="ui-hint warn">
        The server doesn't list existing slips, so slips generated earlier don't show here. Generating again may be
        rejected if a slip already exists for this month.
      </p>

      <div class="ui-toolbar">
        <input v-model="search" class="ui-input ui-search" type="search" placeholder="Search employees…" />
        <button class="btn btn-ghost" :disabled="downloading || !generated.length" @click="downloadAll">
          {{ downloading ? 'Preparing PDF…' : `Download ${generated.length || ''} slips` }}
        </button>
        <button class="btn btn-primary" :disabled="running || isFuture || !selected.size" @click="generateSelected">
          {{ running ? `Generating ${progress.done}/${progress.total}…` : `Generate for selected (${selected.size})` }}
        </button>
      </div>

      <div v-if="!employees.length" class="ui-card ui-empty">
        <strong>No active employees</strong>
        <p>Add employees and assign them a salary structure first.</p>
      </div>

      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  class="check"
                  :checked="allPendingSelected"
                  :disabled="!pending.length"
                  aria-label="Select all without a slip"
                  @change="toggleAll"
                />
              </th>
              <th>Employee</th>
              <th>Status</th>
              <th class="num">Paid days</th>
              <th class="num">Gross</th>
              <th class="num">Net pay</th>
              <th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in shown" :key="e.id">
              <td>
                <input
                  type="checkbox"
                  class="check"
                  :checked="selected.has(e.id)"
                  :disabled="!!rows[e.id]?.slip"
                  :aria-label="`Select ${e.fullName}`"
                  @change="toggle(e.id)"
                />
              </td>
              <td>
                <RouterLink :to="`/employees/${e.id}`" class="ui-person plain">
                  <span class="ui-avatar">{{ initials(e.fullName) }}</span>
                  <span>
                    <strong>{{ e.fullName }}</strong>
                    <small>{{ [e.code, e.designation].filter(Boolean).join(' · ') }}</small>
                  </span>
                </RouterLink>
              </td>
              <td class="status">
                <span v-if="rows[e.id]?.generating" class="ui-pill info">Generating…</span>
                <span v-else-if="rows[e.id]?.slipsLoading" class="ui-muted">Checking…</span>
                <span v-else-if="rows[e.id]?.slip" class="ui-pill success">Generated</span>
                <template v-else-if="rows[e.id]?.error">
                  <span class="ui-pill danger">Failed</span>
                  <small class="err" :title="rows[e.id].error">{{ rows[e.id].error }}</small>
                </template>
                <span v-else class="ui-pill muted">Not generated</span>
              </td>
              <td class="num">
                <template v-if="rows[e.id]?.slip">{{ rows[e.id].slip.paidDays }} / {{ rows[e.id].slip.daysInMonth }}</template>
                <span v-else class="ui-muted">—</span>
              </td>
              <td class="num">{{ rows[e.id]?.slip ? formatINR(rows[e.id].slip.gross) : '—' }}</td>
              <td class="num net">{{ rows[e.id]?.slip ? formatINR(rows[e.id].slip.net) : '—' }}</td>
              <td class="num actions">
                <template v-if="rows[e.id]?.slip">
                  <RouterLink :to="`/payroll/slips/${e.id}/${rows[e.id].slip.id}`" class="btn btn-ghost btn-sm">View</RouterLink>
                  <RouterLink :to="`/payroll/slips/${e.id}/${rows[e.id].slip.id}?download=1`" class="btn btn-ghost btn-sm">
                    Download
                  </RouterLink>
                </template>
                <button
                  v-else
                  class="btn btn-primary btn-sm"
                  :disabled="running || isFuture || rows[e.id]?.generating || rows[e.id]?.slipsLoading"
                  @click="generateFor([e])"
                >
                  {{ rows[e.id]?.error ? 'Retry' : 'Generate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <SlipBatchPdf ref="batch" />
  </div>
</template>

<style scoped>
.options {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.month-field {
  width: 180px;
}

.note-field {
  flex: 1;
  min-width: 240px;
}

.note-field .ui-hint {
  font-weight: 400;
  margin-left: 6px;
}

.incomplete {
  padding-bottom: 6px;
  max-width: 300px;
}

.warn {
  display: block;
  margin: -10px 0 16px;
  color: var(--warning);
}

.check {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.plain {
  text-decoration: none;
}

.status {
  white-space: normal;
  max-width: 260px;
}

.err {
  margin-top: 4px;
  color: var(--danger);
  font-size: 12px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.net {
  color: var(--text-h);
  font-weight: 700;
}

.actions .btn + .btn {
  margin-left: 6px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
