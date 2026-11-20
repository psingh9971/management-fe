<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../../components/app/FormField.vue'
import DocPreview from '../../components/app/docs/DocPreview.vue'
import OfferLetterDocument from '../../components/app/offer/OfferLetterDocument.vue'
import {
  blankOffer,
  createOfferLetter,
  DEFAULT_TERMS,
  getOfferLetter,
  monthlyTotal,
  splitGross,
  updateOfferLetter,
} from '../../services/offerLetterService'
import { listAllEmployees } from '../../services/employeeService'
import { DEPARTMENTS, DESIGNATIONS, EMPLOYMENT_TYPES, SHIFTS, STORES } from '../../services/constants'
import { validateField } from '../../utils/validators'
import { formatINR } from '../../utils/format'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const editId = route.params.id || null

const form = reactive(blankOffer())
const refNo = ref('')
const errors = reactive({})
const loading = ref(!!editId)
const loadError = ref('')
const saving = ref(false)
const gross = ref(15000)
const mobileTab = ref('edit')

const employees = ref([])
const employeesError = ref('')

const preview = computed(() => ({ ...form, refNo: refNo.value }))
const total = computed(() => monthlyTotal(form.salary))
const employeeOptions = computed(() =>
  employees.value.map((e) => ({ value: e.id, label: `${e.fullName} (${e.code})` })),
)

function applyEmployee(id) {
  const e = employees.value.find((x) => x.id === id)
  if (!e) return
  Object.assign(form, {
    employeeId: e.id,
    candidateName: e.fullName,
    salutation: e.gender === 'female' ? 'Ms.' : 'Mr.',
    email: e.email,
    phone: e.phone,
    address: e.address,
    designation: e.designation || form.designation,
    department: e.department || form.department,
    joiningDate: e.joiningDate || form.joiningDate,
  })
  if (e.salary) {
    gross.value = e.salary
    form.salary = splitGross(e.salary)
  }
}

function onEmployeePick(id) {
  form.employeeId = id
  if (id) applyEmployee(id)
}

function resplit() {
  form.salary = splitGross(gross.value)
}

function addComponent() {
  form.salary.push({ label: '', amount: 0 })
}

function removeComponent(i) {
  form.salary.splice(i, 1)
}

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  errors.candidateName = validateField(form.candidateName, ['required'])
  errors.designation = validateField(form.designation, ['required'])
  errors.offerDate = validateField(form.offerDate, ['required'])
  errors.joiningDate = validateField(form.joiningDate, ['required'])
  errors.signatoryName = validateField(form.signatoryName, ['required'])
  if (form.email) errors.email = validateField(form.email, ['email'])
  if (form.acceptBy && form.offerDate && form.acceptBy < form.offerDate) errors.acceptBy = 'Must be on or after the offer date'
  if (form.joiningDate && form.offerDate && form.joiningDate < form.offerDate)
    errors.joiningDate = 'Must be on or after the offer date'
  if (total.value <= 0) errors.salary = 'Add at least one salary component'
  else if (form.salary.some((c) => !String(c.label).trim())) errors.salary = 'Every component needs a name'
  return !Object.values(errors).some(Boolean)
}

async function save(status) {
  if (!validate()) {
    mobileTab.value = 'edit'
    toast('Please fix the highlighted fields', 'error')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, status: status || form.status }
    const saved = editId ? await updateOfferLetter(editId, payload) : await createOfferLetter(payload)
    toast(editId ? 'Offer letter updated' : `Offer letter ${saved.refNo} created`)
    router.push(`/employees/offer-letters/${saved.id}`)
  } catch (e) {
    toast(e.message || 'Could not save the offer letter', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // Employees are optional — candidates who haven't joined yet can be typed in manually.
  listAllEmployees({ status: 'active' })
    .then((list) => {
      employees.value = list
      if (!editId && route.query.employee) onEmployeePick(String(route.query.employee))
    })
    .catch((e) => (employeesError.value = e.message || 'Could not load employees'))

  if (editId) {
    try {
      const l = await getOfferLetter(editId)
      refNo.value = l.refNo
      Object.assign(form, blankOffer(), l)
      gross.value = monthlyTotal(l.salary)
    } catch (e) {
      loadError.value = e.status === 404 ? 'not-found' : e.message
    } finally {
      loading.value = false
    }
  }
})
</script>

<template>
  <div>
    <RouterLink to="/employees/offer-letters" class="back">← Offer letters</RouterLink>

    <div class="ui-page-head">
      <div>
        <h1>{{ editId ? 'Edit offer letter' : 'New offer letter' }}</h1>
        <p class="ui-muted">{{ editId ? refNo : 'Fill in the details — the letter updates live on the right.' }}</p>
      </div>
      <div class="ui-actions">
        <button class="btn btn-ghost" :disabled="saving || loading" @click="save()">
          {{ editId ? 'Save changes' : 'Save as draft' }}
        </button>
        <button v-if="form.status === 'draft'" class="btn btn-primary" :disabled="saving || loading" @click="save('issued')">
          {{ saving ? 'Saving…' : 'Save & issue' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>
    <div v-else-if="loadError" class="ui-card ui-empty">
      <strong>{{ loadError === 'not-found' ? 'Offer letter not found' : "Couldn't load this offer letter" }}</strong>
      <p v-if="loadError !== 'not-found'">{{ loadError }}</p>
    </div>

    <template v-else>
      <div class="ui-tabs mobile-tabs" role="tablist">
        <button :class="{ active: mobileTab === 'edit' }" @click="mobileTab = 'edit'">Details</button>
        <button :class="{ active: mobileTab === 'preview' }" @click="mobileTab = 'preview'">Preview</button>
      </div>

      <div class="editor">
        <form class="pane form-pane" :class="{ hidden: mobileTab !== 'edit' }" novalidate @submit.prevent="save()">
          <div class="ui-card">
            <div class="ui-card-head"><h2>Candidate</h2></div>
            <div class="ui-form-grid two">
              <label class="ui-field full">
                <span class="ui-label">Existing employee</span>
                <select class="ui-input" :value="form.employeeId" @change="onEmployeePick($event.target.value)">
                  <option value="">New candidate (type details below)</option>
                  <option v-for="o in employeeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <small v-if="employeesError" class="ui-hint">Employee list unavailable: {{ employeesError }}</small>
                <small v-else class="ui-hint">Picking an employee fills in their details. You can still edit them.</small>
              </label>
              <FormField v-model="form.salutation" label="Title" type="select" :options="['Mr.', 'Ms.', 'Mrs.', 'Dr.']" />
              <FormField v-model="form.candidateName" label="Full name" required :error="errors.candidateName" />
              <FormField v-model="form.phone" label="Phone" inputmode="tel" maxlength="13" />
              <FormField v-model="form.email" label="Email" type="email" :error="errors.email" />
              <FormField v-model="form.address" label="Address" type="textarea" span="full" hint="One line per row, or separate with commas." />
            </div>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Position</h2></div>
            <div class="ui-form-grid two">
              <label class="ui-field" :class="{ invalid: errors.designation }">
                <span class="ui-label">Designation<em>*</em></span>
                <input v-model="form.designation" class="ui-input" list="ol-designations" autocomplete="off" />
                <datalist id="ol-designations"><option v-for="d in DESIGNATIONS" :key="d" :value="d" /></datalist>
                <small v-if="errors.designation" class="ui-error">{{ errors.designation }}</small>
              </label>
              <label class="ui-field">
                <span class="ui-label">Department</span>
                <input v-model="form.department" class="ui-input" list="ol-departments" autocomplete="off" />
                <datalist id="ol-departments"><option v-for="d in DEPARTMENTS" :key="d" :value="d" /></datalist>
              </label>
              <label class="ui-field">
                <span class="ui-label">Work location</span>
                <input v-model="form.location" class="ui-input" list="ol-stores" autocomplete="off" placeholder="Store / city" />
                <datalist id="ol-stores"><option v-for="s in STORES" :key="s" :value="s" /></datalist>
              </label>
              <FormField v-model="form.employmentType" label="Employment type" type="select" :options="EMPLOYMENT_TYPES" />
              <FormField v-model="form.reportingTo" label="Reporting to" placeholder="e.g. Store Manager" />
              <label class="ui-field">
                <span class="ui-label">Shift / timings</span>
                <input v-model="form.shift" class="ui-input" list="ol-shifts" autocomplete="off" placeholder="Rotational" />
                <datalist id="ol-shifts"><option v-for="s in SHIFTS" :key="s" :value="s" /></datalist>
              </label>
            </div>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Dates &amp; terms</h2></div>
            <div class="ui-form-grid two">
              <FormField v-model="form.offerDate" label="Offer date" type="date" required :error="errors.offerDate" />
              <FormField v-model="form.joiningDate" label="Date of joining" type="date" required :error="errors.joiningDate" />
              <FormField v-model="form.acceptBy" label="Accept by" type="date" :error="errors.acceptBy" />
              <FormField v-model="form.probationMonths" label="Probation (months)" type="number" inputmode="numeric" hint="0 for none" />
              <FormField v-model="form.noticeDays" label="Notice period (days)" type="number" inputmode="numeric" />
            </div>
          </div>

          <div class="ui-card">
            <div class="ui-card-head">
              <h2>Salary (monthly)</h2>
              <strong class="total">{{ formatINR(total) }}<small> / month</small></strong>
            </div>
            <div class="split">
              <label class="ui-field">
                <span class="ui-label">Gross per month (₹)</span>
                <input v-model.number="gross" class="ui-input" type="number" inputmode="numeric" min="0" />
              </label>
              <button type="button" class="btn btn-ghost btn-sm" @click="resplit">Auto-split</button>
            </div>
            <p class="ui-hint split-hint">Auto-split: Basic 50%, HRA 20%, Conveyance up to ₹1,600, rest as special allowance.</p>

            <div class="components">
              <div v-for="(c, i) in form.salary" :key="i" class="comp">
                <input v-model="c.label" class="ui-input" placeholder="Component name" aria-label="Component name" />
                <input v-model.number="c.amount" class="ui-input amt" type="number" inputmode="numeric" min="0" aria-label="Monthly amount" />
                <button type="button" class="icon-btn" aria-label="Remove component" @click="removeComponent(i)">×</button>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" @click="addComponent">+ Add component</button>
            <p v-if="errors.salary" class="ui-error salary-err">{{ errors.salary }}</p>
            <p class="ui-hint">Annual gross: {{ formatINR(total * 12) }}</p>
          </div>

          <div class="ui-card">
            <div class="ui-card-head">
              <h2>Terms &amp; conditions</h2>
              <button type="button" class="btn btn-ghost btn-sm" @click="form.terms = DEFAULT_TERMS">Reset to default</button>
            </div>
            <label class="ui-field">
              <span class="ui-label">One term per line</span>
              <textarea v-model="form.terms" class="ui-input terms" rows="9" />
            </label>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Signed by</h2></div>
            <div class="ui-form-grid two">
              <FormField v-model="form.signatoryName" label="Signatory name" required :error="errors.signatoryName" />
              <FormField v-model="form.signatoryTitle" label="Signatory title" placeholder="Proprietor / HR Manager" />
            </div>
          </div>
        </form>

        <div class="pane preview-pane" :class="{ hidden: mobileTab !== 'preview' }">
          <div class="preview-sticky">
            <DocPreview><OfferLetterDocument :letter="preview" /></DocPreview>
          </div>
        </div>
      </div>
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

.editor {
  display: grid;
  grid-template-columns: minmax(380px, 1fr) minmax(0, 1.15fr);
  gap: 24px;
  align-items: start;
}

.form-pane .ui-card + .ui-card {
  margin-top: 16px;
}

.preview-sticky {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 16px;
  border-radius: 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.ui-form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.total {
  color: var(--text-h);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.total small {
  color: var(--muted);
  font-weight: 500;
  font-size: 12px;
}

.split {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.split .ui-field {
  flex: 1;
}

.split-hint {
  display: block;
  margin: 6px 0 14px;
}

.components {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.comp {
  display: grid;
  grid-template-columns: 1fr 120px 36px;
  gap: 8px;
}

.amt {
  text-align: right;
}

.icon-btn {
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--muted);
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.salary-err {
  margin-top: 8px;
}

.terms {
  font-size: 13px;
  line-height: 1.5;
}

.mobile-tabs {
  display: none;
}

@media (max-width: 1100px) {
  .editor {
    grid-template-columns: 1fr;
  }

  .mobile-tabs {
    display: inline-flex;
  }

  .pane.hidden {
    display: none;
  }

  .preview-sticky {
    position: static;
    max-height: none;
    padding: 8px;
  }
}

@media (max-width: 600px) {
  .ui-form-grid.two {
    grid-template-columns: 1fr;
  }
}
</style>
