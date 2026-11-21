<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '../../components/app/FormField.vue'
import {
  createEmployee,
  getEmployee,
  suggestEmployeeCode,
  toFormValues,
  updateEmployee,
} from '../../services/employeeService'
import * as C from '../../services/constants'
import { validateField } from '../../utils/validators'
import { todayISO } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const editId = route.params.id ? String(route.params.id) : ''
const backTo = editId ? `/employees/${editId}` : '/employees'

const form = reactive({
  // Personal
  firstName: '', lastName: '', dob: '', gender: '', phone: '', email: '', address: '',
  // Employment
  code: '', designation: '', department: '', joiningDate: todayISO(), salary: '', status: 'active',
  // Aadhaar
  aadhaar: '', aadhaarName: '', aadhaarDob: '', aadhaarAddress: '',
  // PAN (optional)
  pan: '', panName: '', panDob: '',
  // Bank
  accountHolder: '', bankName: '', branch: '', accountNumber: '', confirmAccountNumber: '', ifsc: '',
})

const errors = reactive({})
const sameAddress = ref(true)
const saving = ref(false)
const submitted = ref(false)
const loading = ref(!!editId)
const loadError = ref('')
let initial = null // normalized values the edit form was opened with

// Keep the employee's current value selectable even if it's not in the preset list.
const withCurrent = (list, v) => (v && !list.includes(v) ? [v, ...list] : list)
const designations = ref(C.DESIGNATIONS)
const departments = ref(C.DEPARTMENTS)

const sections = [
  {
    id: 'personal',
    title: 'Personal details',
    fields: [
      { key: 'firstName', label: 'First name', required: true, rules: ['required'], maxlength: 100 },
      { key: 'lastName', label: 'Last name', maxlength: 100 },
      { key: 'gender', label: 'Gender', type: 'select', options: C.GENDERS, required: true, rules: ['required'] },
      { key: 'dob', label: 'Date of birth', type: 'date', required: true, rules: ['required', 'adult'], max: todayISO() },
      { key: 'phone', label: 'Mobile number', type: 'tel', inputmode: 'numeric', maxlength: 10, required: true, rules: ['required', 'phone'], placeholder: '10-digit mobile' },
      { key: 'email', label: 'Email', type: 'email', rules: ['email'], placeholder: 'Optional' },
      { key: 'address', label: 'Current address', type: 'textarea', span: 'full', required: true, rules: ['required'] },
    ],
  },
  {
    id: 'job',
    title: 'Employment details',
    fields: [
      { key: 'code', label: 'Employee code', required: true, rules: ['required'], maxlength: 50, upper: true, hint: 'Must be unique' },
      { key: 'designation', label: 'Designation', type: 'select', options: designations, required: true, rules: ['required'] },
      { key: 'department', label: 'Department', type: 'select', options: departments, required: true, rules: ['required'] },
      { key: 'joiningDate', label: 'Date of joining', type: 'date', required: true, rules: ['required'] },
      editId
        ? { key: 'salary', label: 'Monthly gross salary (₹)', type: 'number', inputmode: 'decimal', rules: ['positive'], placeholder: 'Leave blank to keep current', hint: 'Only sent if you enter a new amount' }
        : { key: 'salary', label: 'Monthly gross salary (₹)', type: 'number', inputmode: 'decimal', required: true, rules: ['required', 'positive'], placeholder: 'e.g. 18000' },
      ...(editId
        ? [{ key: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], hint: 'Inactive employees are excluded from attendance and payroll' }]
        : []),
    ],
  },
  {
    id: 'aadhaar',
    title: 'Aadhaar card',
    fields: [
      { key: 'aadhaar', label: 'Aadhaar number', inputmode: 'numeric', required: true, rules: ['required'], placeholder: '1234 5678 9012' },
      { key: 'aadhaarName', label: 'Name on Aadhaar', required: true, rules: ['required'], maxlength: 150 },
      { key: 'aadhaarDob', label: 'Date of birth on Aadhaar', type: 'date', max: todayISO() },
      { key: 'aadhaarAddress', label: 'Address on Aadhaar', type: 'textarea', span: 'full' },
    ],
  },
  {
    id: 'pan',
    title: 'PAN card',
    note: 'Optional — leave the PAN number empty if the employee does not have one.',
    fields: [
      { key: 'pan', label: 'PAN number', upper: true, maxlength: 10, rules: ['pan'], placeholder: 'ABCDE1234F' },
      { key: 'panName', label: 'Name on PAN', maxlength: 150 },
      { key: 'panDob', label: 'Date of birth on PAN', type: 'date', max: todayISO() },
    ],
  },
  {
    id: 'bank',
    title: 'Bank details',
    fields: [
      { key: 'accountHolder', label: 'Account holder name', required: true, rules: ['required'], maxlength: 150 },
      { key: 'bankName', label: 'Bank name', required: true, rules: ['required'], maxlength: 150 },
      { key: 'branch', label: 'Branch', placeholder: 'Optional', maxlength: 150 },
      { key: 'accountNumber', label: 'Account number', inputmode: 'numeric', maxlength: 18, required: true, rules: ['required', 'account'] },
      { key: 'confirmAccountNumber', label: 'Confirm account number', inputmode: 'numeric', maxlength: 18, required: true, rules: ['required'] },
      { key: 'ifsc', label: 'IFSC code', upper: true, maxlength: 11, required: true, rules: ['required', 'ifsc'], placeholder: 'SBIN0001234' },
    ],
  },
]
const allFields = sections.flatMap((s) => s.fields)

const NO_SPACES = ['aadhaar', 'accountNumber', 'confirmAccountNumber', 'phone']
const UPPER = ['pan', 'ifsc', 'code']

function norm(key, v) {
  if (typeof v !== 'string') return v
  if (NO_SPACES.includes(key)) return v.replace(/\s/g, '')
  if (UPPER.includes(key)) return v.trim().toUpperCase()
  return v.trim()
}

const fullName = computed(() => [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' '))

function validateOne(f) {
  const value = norm(f.key, form[f.key])
  let msg = validateField(value, f.rules || [])
  if (!msg && f.key === 'confirmAccountNumber' && value !== norm('accountNumber', form.accountNumber)) {
    msg = 'Account numbers do not match'
  }
  if (!msg && f.key === 'panName' && form.pan.trim() && !value) {
    msg = 'Required when a PAN number is entered'
  }
  errors[f.key] = msg
  return !msg
}

const validateAll = () => allFields.map(validateOne).every(Boolean)

function onBlur(f) {
  if (form[f.key] !== '' || submitted.value) validateOne(f)
}

watch(form, () => submitted.value && validateAll(), { deep: true })

// Keep "copy" fields in sync with their source until the user edits them.
function follow(target, source) {
  watch(source, (next, prev) => {
    if (!form[target] || form[target] === (prev ?? '')) form[target] = next
  })
}
follow('aadhaarName', fullName)
follow('panName', fullName)
follow('accountHolder', fullName)
follow('aadhaarDob', () => form.dob)
follow('panDob', () => form.dob)

watch([sameAddress, () => form.address], () => {
  if (sameAddress.value) form.aadhaarAddress = form.address
})

// Map FastAPI 422 error locations to form fields
const API_FIELD = {
  employee_code: 'code', first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone',
  date_of_birth: 'dob', gender: 'gender', date_of_joining: 'joiningDate', designation: 'designation',
  department: 'department', address: 'address', salary: 'salary',
  'bank_detail.account_holder_name': 'accountHolder', 'bank_detail.account_number': 'accountNumber',
  'bank_detail.ifsc_code': 'ifsc', 'bank_detail.bank_name': 'bankName', 'bank_detail.branch_name': 'branch',
  'aadhaar_card.aadhaar_number': 'aadhaar', 'aadhaar_card.name_on_card': 'aadhaarName',
  'aadhaar_card.date_of_birth': 'aadhaarDob', 'aadhaar_card.address': 'aadhaarAddress',
  'pan_card.pan_number': 'pan', 'pan_card.name_on_card': 'panName', 'pan_card.date_of_birth': 'panDob',
}

function applyServerErrors(err) {
  const detail = err?.data?.detail
  if (!Array.isArray(detail)) return false
  let mapped = false
  for (const d of detail) {
    const key = API_FIELD[(d.loc || []).filter((p) => p !== 'body').join('.')]
    if (key) {
      errors[key] = d.msg
      mapped = true
    }
  }
  return mapped
}

function scrollTo(sectionId) {
  document.getElementById(`sec-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function scrollToFirstError() {
  await nextTick()
  document.querySelector('.ui-field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function submit() {
  submitted.value = true
  if (!validateAll()) {
    toast('Please fix the highlighted fields', 'error')
    return scrollToFirstError()
  }
  saving.value = true
  try {
    const values = {}
    for (const key of Object.keys(form)) values[key] = norm(key, form[key])
    if (editId) {
      const saved = await updateEmployee(editId, values, initial)
      toast(saved ? `Employee ${saved.code} updated` : 'No changes to save')
      router.push(`/employees/${editId}`)
    } else {
      const saved = await createEmployee(values)
      toast(`Employee ${saved.code} added`)
      router.push(`/employees/${saved.id}`)
    }
  } catch (e) {
    submitted.value = false // don't let live validation wipe the server's messages
    if (applyServerErrors(e)) scrollToFirstError()
    toast(e.message || 'Could not save employee', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (editId) {
    try {
      const values = toFormValues(await getEmployee(editId))
      designations.value = withCurrent(C.DESIGNATIONS, values.designation)
      departments.value = withCurrent(C.DEPARTMENTS, values.department)
      sameAddress.value = !values.aadhaarAddress || values.aadhaarAddress === values.address
      Object.assign(form, values)
      await nextTick() // let the auto-fill watchers settle so they don't count as edits
      initial = {}
      for (const key of Object.keys(form)) initial[key] = norm(key, form[key])
    } catch (e) {
      loadError.value = e.status === 404 || e.status === 422 ? 'Employee not found' : e.message
    } finally {
      loading.value = false
    }
    return
  }
  try {
    if (!form.code) form.code = await suggestEmployeeCode()
  } catch {
    /* leave empty — the user can type a code */
  }
})
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>{{ editId ? 'Edit employee' : 'Add new employee' }}</h1>
        <p class="ui-muted">Fields marked <span class="req">*</span> are required.</p>
      </div>
    </div>

    <RouterLink v-if="editId" :to="backTo" class="back">← Back to profile</RouterLink>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="loadError" class="ui-card ui-empty">
      <strong>Couldn't load this employee</strong>
      <p>{{ loadError }}</p>
    </div>

    <form v-else novalidate @submit.prevent="submit">
      <nav class="section-nav" aria-label="Form sections">
        <button v-for="s in sections" :key="s.id" type="button" @click="scrollTo(s.id)">{{ s.title }}</button>
      </nav>

      <section v-for="s in sections" :id="`sec-${s.id}`" :key="s.id" class="ui-card form-section">
        <h2>{{ s.title }}</h2>
        <p v-if="s.note" class="ui-muted note">{{ s.note }}</p>
        <div class="ui-form-grid">
          <template v-for="f in s.fields" :key="f.key">
            <label v-if="f.key === 'aadhaarAddress'" class="same-address">
              <input v-model="sameAddress" type="checkbox" />
              Address on Aadhaar is the same as current address
            </label>
            <FormField
              v-model="form[f.key]"
              :label="f.label"
              :type="f.type || 'text'"
              :options="f.options?.value ?? f.options"
              :required="f.required || (f.key === 'panName' && !!form.pan.trim())"
              :placeholder="f.placeholder"
              :hint="f.hint"
              :inputmode="f.inputmode"
              :maxlength="f.maxlength"
              :max="f.max"
              :upper="f.upper"
              :span="f.span"
              :disabled="f.key === 'aadhaarAddress' && sameAddress"
              :error="errors[f.key]"
              @blur="onBlur(f)"
            />
          </template>
        </div>
      </section>

      <div class="save-bar">
        <RouterLink :to="backTo" class="btn btn-ghost">Cancel</RouterLink>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving…' : editId ? 'Save changes' : 'Add employee' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
}

.back:hover {
  color: var(--text-h);
}

.req {
  color: var(--danger);
}

.section-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 20px;
}

.section-nav button {
  flex-shrink: 0;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.section-nav button:hover {
  border-color: var(--accent-border);
  color: var(--text-h);
}

.form-section {
  scroll-margin-top: 80px;
}

.form-section h2 {
  font-size: 17px;
  margin-bottom: 18px;
}

.note {
  margin: -10px 0 16px;
}

.same-address {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: -6px;
}

.same-address input {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}

.save-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding: 14px 0;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
</style>
