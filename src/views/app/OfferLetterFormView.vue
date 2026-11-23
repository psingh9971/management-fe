<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../../components/app/FormField.vue'
import DocPreview from '../../components/app/docs/DocPreview.vue'
import OfferLetterDocument from '../../components/app/offer/OfferLetterDocument.vue'
import SignaturePad from '../../components/app/offer/SignaturePad.vue'
import {
  blankOffer,
  createOfferLetter,
  DEFAULT_TERMS,
  forDocument,
  getOfferLetter,
  getOfferSalary,
  getSignatory,
  saveSignatory,
  updateOfferLetter,
} from '../../services/offerLetterService'
import { getEmployee, listAllEmployees } from '../../services/employeeService'
import { DEPARTMENTS, DESIGNATIONS, STORES } from '../../services/constants'
import { validateField } from '../../utils/validators'
import { formatINR } from '../../utils/format'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const editId = route.params.id || null

const form = reactive(blankOffer())
const signatory = reactive(getSignatory())
const existing = ref(null) // the letter being edited
const errors = reactive({})
const loading = ref(!!editId)
const loadError = ref('')
const saving = ref(false)
const formError = ref('')
const mobileTab = ref('edit')

const employees = ref([])
const employeesError = ref('')
const employee = ref(null)

// Salary comes from the employee's current salary assignment (the server reads it again on save).
const salary = ref(null)
const salaryState = ref('idle') // idle | loading | ready | none | error
const salaryError = ref('')

const employeeOptions = computed(() =>
  employees.value.map((e) => ({ value: e.id, label: `${e.fullName} (${e.code})` })),
)

const preview = computed(() =>
  forDocument(
    {
      ...(existing.value || {}),
      ...form,
      refNo: existing.value?.refNo || '',
      status: 'provisional',
      candidateName: employee.value?.fullName || existing.value?.candidateName || '',
      joiningDate: form.tentativeJoiningDate,
      joiningTentative: true,
      ...(salary.value || {}),
    },
    employee.value,
    signatory,
  ),
)

async function loadSalary(employeeId) {
  salary.value = null
  salaryError.value = ''
  salaryState.value = 'loading'
  try {
    salary.value = await getOfferSalary(employeeId)
    salaryState.value = salary.value ? 'ready' : 'none'
  } catch (e) {
    salaryError.value = e.message
    salaryState.value = 'error'
  }
}

function onEmployeePick(id) {
  form.employeeId = id
  errors.employeeId = ''
  employee.value = employees.value.find((x) => x.id === id) || null
  if (!employee.value) {
    salary.value = null
    salaryState.value = 'idle'
    return
  }
  form.designation = employee.value.designation || form.designation
  form.department = employee.value.department || form.department
  loadSalary(id)
}

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!editId) {
    errors.employeeId = form.employeeId ? '' : 'Pick the employee this offer is for'
    errors.offerDate = validateField(form.offerDate, ['required'])
  }
  errors.designation = validateField(form.designation, ['required'])
  if (form.tentativeJoiningDate && form.offerDate && form.tentativeJoiningDate < form.offerDate)
    errors.tentativeJoiningDate = 'Must be on or after the offer date'
  if (form.acceptBy && form.offerDate && form.acceptBy < form.offerDate) errors.acceptBy = 'Must be on or after the offer date'
  return !Object.values(errors).some(Boolean)
}

async function save() {
  formError.value = ''
  if (!validate()) {
    mobileTab.value = 'edit'
    toast('Please fix the highlighted fields', 'error')
    return
  }
  if (salaryState.value === 'none') {
    formError.value = 'This employee has no salary assigned yet. Assign one from their profile first.'
    return
  }
  saving.value = true
  saveSignatory(signatory)
  try {
    const saved = editId ? await updateOfferLetter(editId, form) : await createOfferLetter(form.employeeId, form)
    toast(editId ? 'Offer letter updated' : `Offer letter ${saved.refNo} issued`)
    router.push(`/employees/offer-letters/${saved.id}`)
  } catch (e) {
    formError.value = e.message || 'Could not save the offer letter'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (editId) {
    try {
      const l = await getOfferLetter(editId)
      existing.value = l
      Object.assign(form, {
        employeeId: l.employeeId,
        designation: l.designation,
        department: l.department,
        location: l.location,
        offerDate: l.offerDate,
        tentativeJoiningDate: l.tentativeJoiningDate,
        acceptBy: l.acceptBy,
        terms: l.terms,
      })
      employee.value = await getEmployee(l.employeeId).catch(() => null)
      if (l.status === 'provisional') loadSalary(l.employeeId)
    } catch (e) {
      loadError.value = e.status === 404 || e.status === 422 ? 'not-found' : e.message
    } finally {
      loading.value = false
    }
    return
  }

  try {
    employees.value = (await listAllEmployees({ status: 'active' })).sort((a, b) => a.fullName.localeCompare(b.fullName))
    if (route.query.employee) onEmployeePick(String(route.query.employee))
  } catch (e) {
    employeesError.value = e.message || 'Could not load employees'
  }
})
</script>

<template>
  <div>
    <RouterLink to="/employees/offer-letters" class="back">← Offer letters</RouterLink>

    <div class="ui-page-head">
      <div>
        <h1>{{ editId ? 'Edit offer letter' : 'New offer letter' }}</h1>
        <p class="ui-muted">
          {{ editId ? existing?.refNo : 'Fill in the details — the letter updates live on the right.' }}
        </p>
      </div>
      <div v-if="!loadError && (!existing || existing.status === 'provisional')" class="ui-actions">
        <button class="btn btn-primary" :disabled="saving || loading || salaryState === 'loading'" @click="save">
          {{ saving ? 'Saving…' : editId ? 'Save changes' : 'Issue offer letter' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>
    <div v-else-if="loadError" class="ui-card ui-empty">
      <strong>{{ loadError === 'not-found' ? 'Offer letter not found' : "Couldn't load this offer letter" }}</strong>
      <p v-if="loadError !== 'not-found'">{{ loadError }}</p>
    </div>
    <div v-else-if="existing && existing.status !== 'provisional'" class="ui-card ui-empty">
      <strong>This offer letter is {{ existing.status }}</strong>
      <p>Only provisional letters can be edited.</p>
      <RouterLink :to="`/employees/offer-letters/${editId}`" class="btn btn-ghost btn-sm cta">View letter</RouterLink>
    </div>

    <template v-else>
      <div class="ui-tabs mobile-tabs" role="tablist">
        <button :class="{ active: mobileTab === 'edit' }" @click="mobileTab = 'edit'">Details</button>
        <button :class="{ active: mobileTab === 'preview' }" @click="mobileTab = 'preview'">Preview</button>
      </div>

      <div class="editor">
        <form class="pane form-pane" :class="{ hidden: mobileTab !== 'edit' }" novalidate @submit.prevent="save">
          <p v-if="formError" class="ui-form-error">{{ formError }}</p>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Employee</h2></div>
            <template v-if="editId">
              <p class="emp-line">
                <strong>{{ existing.candidateName }}</strong>
                <span class="ui-muted"> · {{ existing.employeeCode }}</span>
              </p>
            </template>
            <label v-else class="ui-field" :class="{ invalid: errors.employeeId }">
              <span class="ui-label">Employee<em>*</em></span>
              <select class="ui-input" :value="form.employeeId" @change="onEmployeePick($event.target.value)">
                <option value="">Select an employee…</option>
                <option v-for="o in employeeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <small v-if="errors.employeeId" class="ui-error">{{ errors.employeeId }}</small>
              <small v-else-if="employeesError" class="ui-hint">Employee list unavailable: {{ employeesError }}</small>
              <small v-else class="ui-hint">
                New candidate? <RouterLink to="/employees/new">Add them as an employee</RouterLink> and assign a salary
                first.
              </small>
            </label>
          </div>

          <div class="ui-card">
            <div class="ui-card-head">
              <h2>Salary</h2>
              <strong v-if="salary" class="total">{{ formatINR(salary.monthlyGross) }}<small> / month</small></strong>
            </div>
            <p v-if="salaryState === 'idle'" class="ui-muted">Pick an employee to see the salary on the letter.</p>
            <p v-else-if="salaryState === 'loading'" class="ui-muted">Loading salary…</p>
            <p v-else-if="salaryState === 'error'" class="ui-form-error">Couldn't load the salary: {{ salaryError }}</p>
            <div v-else-if="salaryState === 'none'" class="ui-form-error">
              No salary structure is assigned to this employee.
              <RouterLink :to="`/employees/${form.employeeId}`">Assign one on their profile</RouterLink>, then come back.
            </div>
            <template v-else>
              <div class="sal">
                <div v-for="c in salary.salary" :key="c.code" class="sal-row">
                  <span>{{ c.label }}</span><b>{{ formatINR(c.amount) }}</b>
                </div>
                <div v-for="c in salary.deductions" :key="c.code" class="sal-row ded">
                  <span>{{ c.label }}</span><b>−{{ formatINR(c.amount) }}</b>
                </div>
                <div class="sal-row total-row"><span>Net take-home</span><b>{{ formatINR(salary.monthlyNet) }}</b></div>
              </div>
              <p class="ui-hint">
                From the "{{ salary.structureName }}" structure assigned to this employee. To change it,
                <RouterLink :to="`/employees/${form.employeeId}`">update their salary</RouterLink> — the letter picks it up
                when saved.
              </p>
            </template>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Position</h2></div>
            <div class="ui-form-grid two">
              <label class="ui-field" :class="{ invalid: errors.designation }">
                <span class="ui-label">Designation<em>*</em></span>
                <input v-model="form.designation" class="ui-input" list="ol-designations" autocomplete="off" maxlength="100" />
                <datalist id="ol-designations"><option v-for="d in DESIGNATIONS" :key="d" :value="d" /></datalist>
                <small v-if="errors.designation" class="ui-error">{{ errors.designation }}</small>
              </label>
              <label class="ui-field">
                <span class="ui-label">Department</span>
                <input v-model="form.department" class="ui-input" list="ol-departments" autocomplete="off" maxlength="100" />
                <datalist id="ol-departments"><option v-for="d in DEPARTMENTS" :key="d" :value="d" /></datalist>
              </label>
              <label class="ui-field full">
                <span class="ui-label">Work location</span>
                <input
                  v-model="form.location"
                  class="ui-input"
                  list="ol-stores"
                  autocomplete="off"
                  maxlength="150"
                  placeholder="Store / city"
                />
                <datalist id="ol-stores"><option v-for="s in STORES" :key="s" :value="s" /></datalist>
              </label>
            </div>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Dates</h2></div>
            <div class="ui-form-grid two">
              <FormField
                v-model="form.offerDate"
                label="Offer date"
                type="date"
                :required="!editId"
                :disabled="!!editId"
                :error="errors.offerDate"
                :hint="editId ? 'Set when the letter was issued' : ''"
              />
              <FormField
                v-model="form.tentativeJoiningDate"
                label="Tentative joining date"
                type="date"
                :error="errors.tentativeJoiningDate"
                hint="Fixed later with Confirm joining"
              />
              <FormField v-model="form.acceptBy" label="Accept by" type="date" :error="errors.acceptBy" />
            </div>
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
              <FormField v-model="signatory.name" label="Signatory name" placeholder="Authorised signatory" />
              <FormField v-model="signatory.title" label="Signatory title" placeholder="Proprietor / HR Manager" />
            </div>
            <div class="ui-field sig-field">
              <span class="ui-label">Signature</span>
              <SignaturePad v-model="signatory.signature" />
            </div>
            <p class="ui-hint">
              Draw with a mouse, finger or stylus, or upload a photo of a signature on white paper. Remembered in this
              browser and printed on every offer letter.
            </p>
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

.emp-line {
  margin: 0;
}

.sal {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.sal-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
}

.sal-row:last-child {
  border-bottom: none;
}

.sal-row b {
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.sal-row.ded b {
  color: var(--danger);
}

.total-row {
  background: var(--bg-soft);
  font-weight: 700;
}

.cta {
  margin-top: 14px;
  display: inline-flex;
}

.form-pane > .ui-form-error {
  margin-bottom: 16px;
}

.sig-field {
  margin-top: 14px;
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
