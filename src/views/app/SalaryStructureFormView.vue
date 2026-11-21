<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../../components/app/FormField.vue'
import {
  blankComponent,
  CALCULATION_TYPES,
  COMPONENT_TYPES,
  createStructure,
  getStructure,
  isPercent,
  needsGross,
  previewStructure,
  PRORATION_BASES,
  SAMPLE_GROSS,
  standardTemplate,
  updateStructure,
} from '../../services/salaryStructureService'
import { formatINR } from '../../utils/format'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const editId = route.params.id ? String(route.params.id) : ''
const fromId = route.query.from ? String(route.query.from) : ''
const sourceId = editId || fromId
const backTo = editId ? `/payroll/structures/${editId}` : '/payroll/structures'

let keySeq = 0
const withKey = (c) => ({ ...c, _key: ++keySeq })

const form = reactive({
  name: '',
  description: '',
  prorationBasis: 'working_days',
  isActive: true,
  components: standardTemplate().map(withKey),
})
const errors = reactive({ name: '', components: '' })
const rowErrors = ref({}) // { [_key]: { code, name, value, baseCode } }
const formError = ref('')
const saving = ref(false)
const loading = ref(!!sourceId)
const loadError = ref('')

const sampleGross = ref(SAMPLE_GROSS)
const usesGross = computed(() => needsGross(form.components))
const preview = computed(() => previewStructure(form.components, sampleGross.value))
const codes = computed(() => form.components.map((c) => c.code.trim().toUpperCase()).filter(Boolean))

function add(type = 'earning') {
  form.components.push(withKey(blankComponent({ type, isProrated: type === 'earning' })))
}

function remove(i) {
  form.components.splice(i, 1)
}

function move(i, dir) {
  const j = i + dir
  if (j < 0 || j >= form.components.length) return
  const [c] = form.components.splice(i, 1)
  form.components.splice(j, 0, c)
}

function useTemplate() {
  if (form.components.some((c) => c.code || c.name) && !confirm('Replace the current components with the standard template?')) return
  form.components = standardTemplate().map(withKey)
}

function clearAll() {
  if (!confirm('Remove all components?')) return
  form.components = [withKey(blankComponent({ code: 'BASIC', name: 'Basic Salary' }))]
}

function validate() {
  errors.name = form.name.trim() ? '' : 'Name is required'
  errors.components = ''
  const out = {}
  const seen = new Map()
  form.components.forEach((c) => {
    const code = c.code.trim().toUpperCase()
    const e = {}
    if (!code) e.code = 'Required'
    else if (!/^[A-Z0-9_]{1,20}$/.test(code)) e.code = 'A–Z, 0–9, _ only'
    else if (seen.has(code)) e.code = 'Duplicate code'
    seen.set(code, true)
    if (!c.name.trim()) e.name = 'Required'
    const v = Number(c.value)
    if (c.calcType !== 'balance') {
      if (c.value === '' || Number.isNaN(v) || v < 0) e.value = 'Enter 0 or more'
      else if (isPercent(c.calcType) && v > 100) e.value = 'Max 100%'
    }
    if (c.calcType === 'balance' && c.type !== 'earning') e.value = 'Earnings only'
    if (c.calcType === 'percent_of_component') {
      if (!c.baseCode) e.baseCode = 'Pick a base'
      else if (c.baseCode === code) e.baseCode = "Can't be itself"
      else if (!codes.value.includes(c.baseCode)) e.baseCode = 'Not in this structure'
    }
    if (Object.keys(e).length) out[c._key] = e
  })
  rowErrors.value = out
  if (!form.components.length) errors.components = 'Add at least one component'
  else if (!form.components.some((c) => c.type === 'earning')) errors.components = 'Add at least one earning'
  else if (form.components.filter((c) => c.calcType === 'balance').length > 1)
    errors.components = 'Only one component can be the balance'
  else if (preview.value.rows.some((r) => r.error === 'Circular reference')) errors.components = 'Two components refer to each other'
  return !errors.name && !errors.components && !Object.keys(out).length
}

async function save() {
  formError.value = ''
  if (!validate()) {
    toast('Please fix the highlighted fields', 'error')
    return
  }
  saving.value = true
  try {
    const s = editId ? await updateStructure(editId, form) : await createStructure(form)
    toast(`${s.name} ${editId ? 'updated' : 'created'}`)
    router.push(`/payroll/structures/${s.id}`)
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!sourceId) return
  try {
    const s = await getStructure(sourceId)
    Object.assign(form, {
      name: editId ? s.name : `${s.name} (copy)`,
      description: s.description,
      prorationBasis: s.prorationBasis,
      isActive: editId ? s.isActive : true,
      components: s.components.map(({ id, sequence, ...c }) => withKey(c)),
    })
  } catch (e) {
    if (editId) loadError.value = e.status === 404 ? 'Salary structure not found' : e.message
    else toast(`Couldn't copy that structure: ${e.message}`, 'error')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <RouterLink :to="backTo" class="back">← {{ editId ? 'Back to structure' : 'Salary structures' }}</RouterLink>

    <div class="ui-page-head">
      <div>
        <h1>{{ editId ? 'Edit salary structure' : fromId ? 'Duplicate structure' : 'New salary structure' }}</h1>
        <p class="ui-muted">
          Amounts are for a full month; prorated components scale with paid days.
          <template v-if="editId">Saving replaces all components; already generated slips stay as they are.</template>
        </p>
      </div>
      <div class="ui-actions">
        <RouterLink :to="backTo" class="btn btn-ghost">Cancel</RouterLink>
        <button class="btn btn-primary" :disabled="saving || loading || !!loadError" @click="save">
          {{ saving ? 'Saving…' : editId ? 'Save changes' : 'Create structure' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="loadError" class="ui-card ui-empty">
      <strong>Couldn't load this structure</strong>
      <p>{{ loadError }}</p>
    </div>

    <div v-else class="layout">
      <form class="main" novalidate @submit.prevent="save">
        <p v-if="formError" class="ui-form-error">{{ formError }}</p>

        <div class="ui-card">
          <div class="ui-card-head"><h2>Details</h2></div>
          <div class="ui-form-grid two">
            <FormField v-model="form.name" label="Name" required placeholder="e.g. Store staff" :error="errors.name" />
            <FormField v-model="form.prorationBasis" label="Prorate by" type="select" :options="PRORATION_BASES" />
            <FormField v-model="form.description" label="Description" type="textarea" span="full" placeholder="Optional" />
            <label class="ui-check full">
              <input v-model="form.isActive" type="checkbox" />
              <span>Active<small>Inactive structures can't be assigned to new payrolls.</small></span>
            </label>
          </div>
        </div>

        <div class="ui-card">
          <div class="ui-card-head">
            <h2>Components</h2>
            <div class="head-actions">
              <button type="button" class="btn btn-ghost btn-sm" @click="useTemplate">Use standard template</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="clearAll">Clear</button>
            </div>
          </div>

          <div class="comp-head" aria-hidden="true">
            <span>Code</span><span>Name</span><span>Type</span><span>Calculation</span><span>Value</span><span>Base</span
            ><span>Prorated</span><span />
          </div>

          <div
            v-for="(c, i) in form.components"
            :key="c._key"
            class="comp"
            :class="[c.type, { invalid: rowErrors[c._key] }]"
          >
            <label class="cell">
              <span class="m-label">Code</span>
              <input v-model="c.code" class="ui-input upper mono" maxlength="20" placeholder="BASIC" aria-label="Code" />
              <small v-if="rowErrors[c._key]?.code" class="ui-error">{{ rowErrors[c._key].code }}</small>
            </label>
            <label class="cell">
              <span class="m-label">Name</span>
              <input v-model="c.name" class="ui-input" placeholder="Basic Salary" aria-label="Name" />
              <small v-if="rowErrors[c._key]?.name" class="ui-error">{{ rowErrors[c._key].name }}</small>
            </label>
            <label class="cell">
              <span class="m-label">Type</span>
              <select v-model="c.type" class="ui-input" aria-label="Type">
                <option v-for="o in COMPONENT_TYPES" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <label class="cell">
              <span class="m-label">Calculation</span>
              <select v-model="c.calcType" class="ui-input" aria-label="Calculation">
                <option v-for="o in CALCULATION_TYPES" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <label class="cell">
              <span class="m-label">Value</span>
              <span v-if="c.calcType === 'balance'" class="ui-muted na">auto</span>
              <span v-else class="value-wrap">
                <span class="affix">{{ isPercent(c.calcType) ? '%' : '₹' }}</span>
                <input v-model.number="c.value" class="ui-input num" type="number" min="0" step="any" aria-label="Value" />
              </span>
              <small v-if="rowErrors[c._key]?.value" class="ui-error">{{ rowErrors[c._key].value }}</small>
            </label>
            <label class="cell">
              <span class="m-label">Base</span>
              <select v-if="c.calcType === 'percent_of_component'" v-model="c.baseCode" class="ui-input" aria-label="Base component">
                <option value="" disabled>of…</option>
                <option v-for="code in codes.filter((x) => x !== c.code.trim().toUpperCase())" :key="code" :value="code">
                  {{ code }}
                </option>
              </select>
              <span v-else class="ui-muted na">—</span>
              <small v-if="rowErrors[c._key]?.baseCode" class="ui-error">{{ rowErrors[c._key].baseCode }}</small>
            </label>
            <label class="cell check-cell">
              <span class="m-label">Prorated</span>
              <input v-model="c.isProrated" type="checkbox" class="check" aria-label="Prorated" />
            </label>
            <div class="cell row-actions">
              <button type="button" class="icon" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)">↑</button>
              <button type="button" class="icon" :disabled="i === form.components.length - 1" aria-label="Move down" @click="move(i, 1)">↓</button>
              <button type="button" class="icon danger" aria-label="Remove" @click="remove(i)">×</button>
            </div>
          </div>

          <p v-if="errors.components" class="ui-error comp-err">{{ errors.components }}</p>

          <div class="add">
            <button type="button" class="btn btn-ghost btn-sm" @click="add('earning')">+ Earning</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="add('deduction')">+ Deduction</button>
          </div>
        </div>
      </form>

      <aside class="side">
        <div class="ui-card sticky">
          <div class="ui-card-head"><h2>Monthly preview</h2></div>
          <label v-if="usesGross" class="ui-field">
            <span class="ui-label">Sample gross / month (₹)</span>
            <input v-model.number="sampleGross" class="ui-input" type="number" min="0" step="500" />
          </label>
          <p class="ui-hint">
            {{ usesGross ? 'Each employee’s own gross is used in payroll. ' : '' }}Full month, before proration.
          </p>
          <table class="pv">
            <tbody>
              <tr v-for="r in preview.rows" :key="r._key" :class="r.type">
                <td>
                  {{ r.name || r.code || 'Untitled' }}
                  <small v-if="r.error" class="ui-error">{{ r.error }}</small>
                </td>
                <td class="num">{{ r.type === 'deduction' ? '−' : '' }}{{ formatINR(r.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Earnings</td>
                <td class="num">{{ formatINR(preview.earnings) }}</td>
              </tr>
              <tr>
                <td>Deductions</td>
                <td class="num">− {{ formatINR(preview.deductions) }}</td>
              </tr>
              <tr class="net">
                <td>Net pay</td>
                <td class="num">{{ formatINR(preview.net) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </aside>
    </div>
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

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}

.main .ui-card + .ui-card {
  margin-top: 16px;
}

.ui-form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ui-check.full {
  grid-column: 1 / -1;
}

.head-actions {
  display: flex;
  gap: 8px;
}

/* Component grid */
.comp-head,
.comp {
  display: grid;
  grid-template-columns: 110px minmax(120px, 1.4fr) 110px 170px 110px 100px 64px 96px;
  gap: 8px;
  align-items: start;
}

.comp-head {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  padding: 0 8px 6px 11px;
}

.comp {
  padding: 8px 8px 8px 8px;
  border-radius: 10px;
  border-left: 3px solid var(--success);
  background: var(--bg-soft);
  margin-bottom: 8px;
}

.comp.deduction {
  border-left-color: var(--danger);
}

.comp.invalid {
  outline: 1px solid var(--danger);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cell .ui-input {
  padding: 8px 10px;
  background: var(--card-bg);
}

.m-label {
  display: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
}

.value-wrap {
  position: relative;
  display: block;
}

.affix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 13px;
  pointer-events: none;
}

.num {
  text-align: right;
}

.value-wrap .ui-input {
  padding-left: 24px;
}

.na {
  padding: 9px 4px;
}

.check-cell {
  align-items: center;
  padding-top: 10px;
}

.check {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.row-actions {
  flex-direction: row;
  gap: 4px;
}

.icon {
  width: 28px;
  height: 36px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--muted);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.icon:hover:not(:disabled) {
  color: var(--text-h);
  border-color: var(--accent-border);
}

.icon.danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.icon:disabled {
  opacity: 0.35;
  cursor: default;
}

.comp-err {
  display: block;
  margin: 4px 0 8px;
}

.add {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

/* Preview */
.sticky {
  position: sticky;
  top: 16px;
}

.pv {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 10px;
}

.pv td {
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: top;
}

.pv td small {
  display: block;
}

.pv tr.deduction td.num {
  color: var(--danger);
}

.pv .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  padding-left: 10px;
}

.pv tfoot td {
  color: var(--text-h);
  font-weight: 600;
}

.pv tfoot tr.net td {
  border-bottom: none;
  font-size: 15px;
  color: var(--accent);
  font-weight: 700;
}

@media (max-width: 1400px) {
  .comp-head {
    display: none;
  }

  .comp {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 12px;
  }

  .m-label {
    display: block;
  }

  .row-actions {
    align-items: flex-end;
    justify-content: flex-end;
    grid-column: span 2;
  }

  .check-cell {
    align-items: flex-start;
    padding-top: 0;
  }
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sticky {
    position: static;
  }
}

@media (max-width: 600px) {
  .comp,
  .ui-form-grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .comp .cell:nth-child(2) {
    grid-column: span 2;
  }
}
</style>
