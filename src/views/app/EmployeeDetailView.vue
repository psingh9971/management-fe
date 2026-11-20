<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getEmployee } from '../../services/employeeService'
import { assignEmployeePolicy, describeRule, getEmployeePolicy, listPolicies } from '../../services/weekOffService'
import { toast } from '../../stores/toast'
import EmployeeSalaryCard from '../../components/app/payroll/EmployeeSalaryCard.vue'
import { attendancePercent, getEmployeeMonth } from '../../services/attendanceService'
import { ATTENDANCE_STATUSES } from '../../services/constants'
import { formatAadhaar, formatINR, initials, maskAadhaar, maskAccount } from '../../utils/format'
import { currentMonth, formatDate, formatMonth } from '../../utils/date'

const route = useRoute()
const id = route.params.id

const emp = ref(null)
const month = ref({ P: 0, HD: 0, A: 0, L: 0, WO: 0 })
const loading = ref(true)
const error = ref('')
const reveal = ref({ aadhaar: false, account: false })

// Week-off policy
const policies = ref([])
const currentPolicy = ref(null)
const selectedPolicy = ref('')
const policyLoading = ref(true)
const policyError = ref('')
const policySaving = ref(false)
const defaultPolicy = computed(() => policies.value.find((p) => p.isDefault))
const policyChanged = computed(() => selectedPolicy.value !== (currentPolicy.value?.id || ''))

async function loadPolicy() {
  policyLoading.value = true
  policyError.value = ''
  try {
    const [all, current] = await Promise.all([listPolicies(), getEmployeePolicy(id)])
    policies.value = all
    currentPolicy.value = current
    selectedPolicy.value = current?.id || ''
  } catch (e) {
    policyError.value = e.message
  } finally {
    policyLoading.value = false
  }
}

async function savePolicy() {
  policySaving.value = true
  try {
    currentPolicy.value = await assignEmployeePolicy(id, selectedPolicy.value || null)
    selectedPolicy.value = currentPolicy.value?.id || ''
    toast('Week-off policy updated')
  } catch (e) {
    toast(e.message || 'Could not update week-off policy', 'error')
  } finally {
    policySaving.value = false
  }
}

const TONE = { P: 'success', HD: 'warning', A: 'danger', L: 'info', WO: 'muted' }

const v = (x) => (x === '' || x === null || x === undefined ? '—' : x)

// Each item: [label, value, span?, secretKey?]
const sections = computed(() => {
  const e = emp.value
  if (!e) return []
  const a = e.aadhaar
  const p = e.pan
  const b = e.bank
  return [
    {
      title: 'Personal details',
      items: [
        ['Full name', e.fullName],
        ['Gender', e.genderLabel],
        ['Date of birth', e.dob && formatDate(e.dob)],
        ['Mobile', e.phone],
        ['Email', e.email],
        ['Current address', e.address, 'full'],
      ],
    },
    {
      title: 'Employment',
      items: [
        ['Employee code', e.code],
        ['Designation', e.designation],
        ['Department', e.department],
        ['Date of joining', e.joiningDate && formatDate(e.joiningDate)],
        ...(e.salary !== null ? [['Monthly gross salary', formatINR(e.salary)]] : []),
        ['Added on', e.createdAt && new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
      ],
    },
    {
      title: 'Aadhaar card',
      empty: !a && 'Aadhaar details not added.',
      items: a
        ? [
            ['Aadhaar number', reveal.value.aadhaar ? formatAadhaar(a.number) : maskAadhaar(a.number), '', 'aadhaar'],
            ['Name on card', a.name],
            ['Date of birth', a.dob && formatDate(a.dob)],
            ['Address on card', a.address, 'full'],
          ]
        : [],
    },
    {
      title: 'PAN card',
      empty: !p && 'PAN details not added.',
      items: p
        ? [
            ['PAN number', p.number],
            ['Name on card', p.name],
            ['Date of birth', p.dob && formatDate(p.dob)],
          ]
        : [],
    },
    {
      title: 'Bank details',
      empty: !b && 'Bank details not added.',
      items: b
        ? [
            ['Account holder', b.accountHolder],
            ['Bank', b.bankName],
            ['Branch', b.branch],
            ['Account number', reveal.value.account ? b.accountNumber : maskAccount(b.accountNumber), '', 'account'],
            ['IFSC', b.ifsc],
          ]
        : [],
    },
  ]
})

onMounted(async () => {
  try {
    emp.value = await getEmployee(id)
  } catch (e) {
    error.value = e.status === 404 || e.status === 422 ? 'not-found' : e.message
  } finally {
    loading.value = false
  }
  if (emp.value) {
    loadPolicy()
    getEmployeeMonth(id, currentMonth())
      .then((c) => (month.value = c))
      .catch(() => {})
  }
})
</script>

<template>
  <div>
    <RouterLink to="/employees" class="back">← All employees</RouterLink>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>{{ error === 'not-found' ? 'Employee not found' : "Couldn't load this employee" }}</strong>
      <p v-if="error !== 'not-found'">{{ error }}</p>
    </div>

    <template v-else-if="emp">
      <div class="ui-card profile">
        <span class="ui-avatar big">{{ initials(emp.fullName) }}</span>
        <div class="profile-text">
          <h1>{{ emp.fullName }}</h1>
          <p>{{ [emp.code, emp.designation, emp.department].filter(Boolean).join(' · ') }}</p>
          <span class="ui-pill" :class="emp.status === 'active' ? 'success' : 'muted'">
            {{ emp.status === 'active' ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="offer-btn">
          <RouterLink :to="`/payroll/slips?employee=${emp.id}`" class="btn btn-ghost btn-sm">Salary slips</RouterLink>
          <RouterLink :to="`/employees/offer-letters/new?employee=${emp.id}`" class="btn btn-ghost btn-sm">
            Generate offer letter
          </RouterLink>
        </div>
      </div>

      <EmployeeSalaryCard :employee-id="emp.id" />

      <div class="ui-card">
        <div class="ui-card-head">
          <h2>Week-off policy</h2>
          <RouterLink to="/employees/leaves" class="btn btn-ghost btn-sm">Manage policies</RouterLink>
        </div>
        <p v-if="policyLoading" class="ui-muted">Loading…</p>
        <p v-else-if="policyError" class="ui-error">{{ policyError }}</p>
        <template v-else>
          <div class="policy-row">
            <select v-model="selectedPolicy" class="ui-input policy-select" aria-label="Week-off policy">
              <option value="">Use default policy{{ defaultPolicy ? ` (${defaultPolicy.name})` : '' }}</option>
              <option v-for="p in policies" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="btn btn-primary btn-sm" :disabled="!policyChanged || policySaving" @click="savePolicy">
              {{ policySaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p class="ui-muted policy-rules">
            <template v-if="currentPolicy">
              Current: <strong>{{ currentPolicy.name }}</strong> — {{ currentPolicy.rules.map(describeRule).join(', ') }}
            </template>
            <template v-else-if="defaultPolicy">
              Using the default policy: {{ defaultPolicy.rules.map(describeRule).join(', ') }}
            </template>
            <template v-else>No policy assigned and no default policy set.</template>
          </p>
        </template>
      </div>

      <div class="ui-card">
        <div class="ui-card-head">
          <h2>Attendance — {{ formatMonth(currentMonth()) }}</h2>
          <RouterLink to="/employees/attendance" class="btn btn-ghost btn-sm">Open attendance</RouterLink>
        </div>
        <div class="att">
          <div v-for="s in ATTENDANCE_STATUSES" :key="s.key" class="att-item">
            <span class="ui-pill" :class="TONE[s.key]">{{ s.label }}</span>
            <strong>{{ month[s.key] }}</strong>
          </div>
          <div class="att-item">
            <span class="ui-muted">Attendance</span>
            <strong>{{ attendancePercent(month) === null ? '—' : `${attendancePercent(month)}%` }}</strong>
          </div>
        </div>
      </div>

      <div v-for="s in sections" :key="s.title" class="ui-card">
        <h2 class="sec-title">{{ s.title }}</h2>
        <p v-if="s.empty" class="ui-muted">{{ s.empty }}</p>
        <dl v-else class="ui-dl">
          <div v-for="[label, value, span, secret] in s.items" :key="label" :class="span">
            <dt>{{ label }}</dt>
            <dd>
              {{ v(value) }}
              <button v-if="secret && value" class="reveal" @click="reveal[secret] = !reveal[secret]">
                {{ reveal[secret] ? 'Hide' : 'Show' }}
              </button>
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </div>
</template>

<style scoped>
.offer-btn {
  margin-left: auto;
  align-self: flex-start;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.back {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.back:hover {
  color: var(--text-h);
}

.profile {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.ui-avatar.big {
  width: 64px;
  height: 64px;
  font-size: 20px;
}

.profile-text {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.profile-text h1 {
  font-size: 24px;
}

.profile-text p {
  font-size: 14px;
}

.sec-title {
  font-size: 17px;
  margin-bottom: 16px;
}

.att {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.att-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-soft);
}

.att-item strong {
  font-size: 22px;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.policy-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.policy-select {
  flex: 1;
  min-width: 220px;
  max-width: 420px;
}

.policy-rules {
  margin-top: 10px;
}

.policy-rules strong {
  color: var(--text-h);
}

.reveal {
  margin-left: 8px;
  background: none;
  border: none;
  color: var(--accent);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}
</style>
