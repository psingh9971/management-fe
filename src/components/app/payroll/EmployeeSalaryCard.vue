<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import FormField from '../FormField.vue'
import {
  assignStructure,
  currentAssignment,
  deleteAssignment,
  describeComponent,
  listAssignments,
  listStructures,
  previewStructure,
} from '../../../services/salaryStructureService'
import { formatINR } from '../../../utils/format'
import { formatDate, todayISO } from '../../../utils/date'
import { toast } from '../../../stores/toast'

// Salary structure assignment for one employee (shown on the employee profile).
const props = defineProps({ employeeId: { type: String, required: true } })

const structures = ref([])
const assignments = ref(null) // null = backend has no list endpoint
const lastAssigned = ref(null) // shown when history isn't available
const loading = ref(true)
const error = ref('')

const structureById = computed(() => new Map(structures.value.map((s) => [s.id, s])))
const activeStructures = computed(() => structures.value.filter((s) => s.isActive))
const resolve = (a) => (a ? { ...a, structure: a.structure || structureById.value.get(a.structureId) || null } : null)

const current = computed(() =>
  resolve(assignments.value ? currentAssignment(assignments.value, todayISO()) : lastAssigned.value),
)
const upcoming = computed(() =>
  (assignments.value || []).filter((a) => a.effectiveFrom > todayISO()).map(resolve).reverse(),
)
const history = computed(() =>
  (assignments.value || []).filter((a) => a.effectiveFrom <= todayISO() && a.id !== current.value?.id).map(resolve),
)
const breakdown = computed(() =>
  current.value?.structure ? previewStructure(current.value.structure.components, current.value.monthlyGross) : null,
)
const structureName = (a) => a.structure?.name || 'Unknown structure'

// Only the newest assignment can be undone (the backend then reopens the previous one).
const latest = computed(() => (assignments.value ? assignments.value[0] : lastAssigned.value) || null)
const isLatest = (a) => !!a?.id && a.id === latest.value?.id
const undoing = ref(false)

async function undo(a) {
  const msg = `Undo ${structureName(a)} at ${formatINR(a.monthlyGross)} from ${formatDate(a.effectiveFrom)}?`
  if (!confirm(`${msg} The previous salary assignment (if any) will apply again.`)) return
  undoing.value = true
  try {
    await deleteAssignment(props.employeeId, a.id)
    lastAssigned.value = null
    toast('Salary assignment removed')
    if (assignments.value) assignments.value = await listAssignments(props.employeeId)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    undoing.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [s, a] = await Promise.all([listStructures(), listAssignments(props.employeeId)])
    structures.value = s
    assignments.value = a
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ---------- assign modal ----------
const modal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ structureId: '', effectiveFrom: todayISO(), monthlyGross: '' })
const errors = reactive({ structureId: '', effectiveFrom: '', monthlyGross: '' })

const options = computed(() => activeStructures.value.map((s) => ({ value: s.id, label: s.name })))
const picked = computed(() => structureById.value.get(form.structureId))
const modalPreview = computed(() =>
  picked.value && Number(form.monthlyGross) > 0 ? previewStructure(picked.value.components, form.monthlyGross) : null,
)
const previewErrors = computed(() => (modalPreview.value?.rows || []).filter((r) => r.error))

function open() {
  Object.assign(form, {
    structureId: current.value?.structureId || activeStructures.value[0]?.id || '',
    effectiveFrom: todayISO(),
    monthlyGross: current.value?.monthlyGross || '',
  })
  Object.assign(errors, { structureId: '', effectiveFrom: '', monthlyGross: '' })
  formError.value = ''
  modal.value = true
}

async function save() {
  errors.structureId = form.structureId ? '' : 'Pick a structure'
  errors.effectiveFrom = form.effectiveFrom ? '' : 'Required'
  const g = Number(form.monthlyGross)
  errors.monthlyGross = !form.monthlyGross || Number.isNaN(g) || g <= 0 ? 'Enter the monthly gross' : ''
  if (errors.structureId || errors.effectiveFrom || errors.monthlyGross) return
  saving.value = true
  formError.value = ''
  try {
    const res = await assignStructure(props.employeeId, form)
    lastAssigned.value = res || {
      structureId: form.structureId,
      effectiveFrom: form.effectiveFrom,
      monthlyGross: g,
    }
    modal.value = false
    toast(`${picked.value?.name || 'Structure'} assigned from ${formatDate(form.effectiveFrom)}`)
    if (assignments.value) assignments.value = await listAssignments(props.employeeId)
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ui-card">
    <div class="ui-card-head">
      <h2>Salary</h2>
      <div class="head-actions">
        <RouterLink to="/payroll/structures" class="btn btn-ghost btn-sm">Structures</RouterLink>
        <button class="btn btn-primary btn-sm" :disabled="loading || !!error" @click="open">
          {{ current ? 'Change salary' : 'Assign structure' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="ui-muted">Loading…</p>
    <p v-else-if="error" class="ui-error">{{ error }}</p>

    <template v-else>
      <div v-if="current" class="current">
        <div class="summary">
          <div>
            <small>Structure</small>
            <RouterLink v-if="current.structure" :to="`/payroll/structures/${current.structureId}`" class="strong">
              {{ structureName(current) }}
            </RouterLink>
            <strong v-else>{{ structureName(current) }}</strong>
          </div>
          <div>
            <small>Monthly gross</small>
            <strong>{{ formatINR(current.monthlyGross) }}</strong>
          </div>
          <div v-if="breakdown">
            <small>Net / month</small>
            <strong class="net">{{ formatINR(breakdown.net) }}</strong>
          </div>
          <div>
            <small>Effective from</small>
            <strong>{{ formatDate(current.effectiveFrom) }}</strong>
          </div>
        </div>
        <button v-if="isLatest(current)" class="link-btn danger" :disabled="undoing" @click="undo(current)">
          {{ undoing ? 'Removing…' : 'Undo this assignment' }}
        </button>

        <div v-if="breakdown" class="breakdown">
          <span v-for="r in breakdown.rows" :key="r.code" class="item" :class="r.type">
            <span>{{ r.name }}</span>
            <b>{{ r.type === 'deduction' ? '−' : '' }}{{ formatINR(r.amount) }}</b>
          </span>
        </div>
      </div>

      <p v-else class="ui-muted">
        No salary structure assigned{{ assignments === null ? ' (or the history isn’t available from the server)' : '' }}.
        Assign one so payroll knows this employee's pay.
      </p>

      <div v-if="upcoming.length || history.length" class="hist">
        <h3>History</h3>
        <ul>
          <li v-for="a in upcoming" :key="a.id">
            <span class="ui-pill info">Upcoming</span>
            {{ structureName(a) }} · {{ formatINR(a.monthlyGross) }} · from {{ formatDate(a.effectiveFrom) }}
            <button v-if="isLatest(a)" class="link-btn danger" :disabled="undoing" @click="undo(a)">
              {{ undoing ? 'Removing…' : 'Undo' }}
            </button>
          </li>
          <li v-for="a in history" :key="a.id">
            <span class="ui-pill muted">Past</span>
            {{ structureName(a) }} · {{ formatINR(a.monthlyGross) }} · from {{ formatDate(a.effectiveFrom) }}
          </li>
        </ul>
      </div>
    </template>

    <div v-if="modal" class="ui-modal-backdrop" @click.self="modal = false">
      <form class="ui-modal" novalidate @submit.prevent="save">
        <h2>{{ current ? 'Change salary' : 'Assign salary structure' }}</h2>

        <p v-if="!options.length" class="ui-form-error">
          No active salary structures yet. <RouterLink to="/payroll/structures/new">Create one first.</RouterLink>
        </p>

        <div class="ui-form-grid two">
          <FormField v-model="form.structureId" label="Salary structure" type="select" :options="options" required span="full" :error="errors.structureId" />
          <FormField v-model="form.monthlyGross" label="Monthly gross (₹)" type="number" inputmode="numeric" required :error="errors.monthlyGross" />
          <FormField v-model="form.effectiveFrom" label="Effective from" type="date" required :error="errors.effectiveFrom" />
        </div>

        <div v-if="modalPreview" class="mp">
          <div v-for="r in modalPreview.rows" :key="r.code" class="mp-row" :class="r.type">
            <span>
              {{ r.name }} <small>{{ describeComponent(r) }}</small>
            </span>
            <b>{{ r.type === 'deduction' ? '−' : '' }}{{ formatINR(r.amount) }}</b>
          </div>
          <div class="mp-row total">
            <span>Net pay / month</span>
            <b>{{ formatINR(modalPreview.net) }}</b>
          </div>
        </div>
        <p v-for="r in previewErrors" :key="r.code" class="ui-error">{{ r.name }}: {{ r.error }}</p>

        <p v-if="formError" class="ui-form-error top-gap">{{ formError }}</p>

        <div class="ui-modal-actions">
          <button type="button" class="btn btn-ghost" @click="modal = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving || !options.length">
            {{ saving ? 'Saving…' : 'Assign' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.head-actions {
  display: flex;
  gap: 8px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.summary small {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 2px;
}

.summary strong,
.summary .strong {
  color: var(--text-h);
  font-weight: 700;
  font-size: 15px;
}

.summary .strong {
  text-decoration: none;
  border-bottom: 1px dashed var(--accent-border);
}

.summary .net {
  color: var(--accent);
}

.link-btn {
  margin-top: 12px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.hist .link-btn {
  margin-top: 0;
}

.link-btn.danger {
  color: var(--danger);
}

.link-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.item {
  display: inline-flex;
  gap: 8px;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-left: 3px solid var(--success);
}

.item.deduction {
  border-left-color: var(--danger);
}

.item b {
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.hist {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.hist h3 {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}

.hist ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.hist li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ui-form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mp {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  font-size: 13px;
}

.mp-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0;
}

.mp-row small {
  color: var(--muted);
  margin-left: 6px;
}

.mp-row b {
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.mp-row.deduction b {
  color: var(--danger);
}

.mp-row.total {
  border-top: 1px solid var(--border);
  margin-top: 4px;
  padding-top: 8px;
  font-weight: 700;
  color: var(--text-h);
}

.mp-row.total b {
  color: var(--accent);
  font-size: 15px;
}

.top-gap {
  margin-top: 14px;
}

@media (max-width: 600px) {
  .ui-form-grid.two {
    grid-template-columns: 1fr;
  }
}
</style>
