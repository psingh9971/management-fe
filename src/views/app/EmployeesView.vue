<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listEmployees } from '../../services/employeeService'
import { DEPARTMENTS } from '../../services/constants'
import { initials } from '../../utils/format'
import { formatDate } from '../../utils/date'

const PAGE_SIZE = 50

const router = useRouter()
const filters = reactive({ search: '', status: '', department: '' })
const page = ref(0)
const employees = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

const hasFilters = computed(() => Object.values(filters).some(Boolean))
const from = computed(() => (total.value ? page.value * PAGE_SIZE + 1 : 0))
const to = computed(() => page.value * PAGE_SIZE + employees.value.length)
const lastPage = computed(() => Math.max(0, Math.ceil(total.value / PAGE_SIZE) - 1))

let requestId = 0
async function load() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const res = await listEmployees({ ...filters, skip: page.value * PAGE_SIZE, limit: PAGE_SIZE })
    if (id !== requestId) return // a newer request has started
    employees.value = res.items
    total.value = res.total
  } catch (e) {
    if (id === requestId) error.value = e.message
  } finally {
    if (id === requestId) loading.value = false
  }
}

let timer
watch(
  () => ({ ...filters }),
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      page.value = 0
      load()
    }, 300)
  },
)

function goTo(p) {
  page.value = p
  load()
}

function clearFilters() {
  Object.assign(filters, { search: '', status: '', department: '' })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Employees</h1>
        <p class="ui-muted">Everyone working across your stores.</p>
      </div>
      <div class="ui-actions">
        <RouterLink to="/employees/attendance" class="btn btn-ghost">Attendance</RouterLink>
        <RouterLink to="/employees/new" class="btn btn-primary">+ Add employee</RouterLink>
      </div>
    </div>

    <div class="ui-toolbar">
      <input
        v-model="filters.search"
        type="search"
        class="ui-input ui-search"
        placeholder="Search by name, employee code or email"
        aria-label="Search employees"
      />
      <select v-model="filters.department" class="ui-input" aria-label="Filter by department">
        <option value="">All departments</option>
        <option v-for="d in DEPARTMENTS" :key="d" :value="d">{{ d }}</option>
      </select>
      <select v-model="filters.status" class="ui-input" aria-label="Filter by status">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button v-if="hasFilters" class="btn btn-ghost btn-sm" @click="clearFilters">Clear</button>
    </div>

    <div v-if="error" class="ui-card ui-empty">
      <strong>Couldn't load employees</strong>
      <p>{{ error }}</p>
      <button class="btn btn-ghost btn-sm retry" @click="load">Try again</button>
    </div>

    <template v-else>
      <p class="ui-muted count">
        {{ loading && !employees.length ? 'Loading…' : `${total} employee${total === 1 ? '' : 's'}` }}
      </p>

      <div v-if="!loading && !employees.length" class="ui-card ui-empty">
        <strong>{{ hasFilters ? 'No employees match these filters' : 'No employees yet' }}</strong>
        <p v-if="!hasFilters">Add your first employee to get started.</p>
        <RouterLink v-if="!hasFilters" to="/employees/new" class="btn btn-primary btn-sm retry">
          + Add employee
        </RouterLink>
      </div>

      <div v-else-if="employees.length" class="ui-table-wrap" :class="{ dim: loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Mobile</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in employees" :key="e.id" class="clickable" @click="router.push(`/employees/${e.id}`)">
              <td>
                <RouterLink :to="`/employees/${e.id}`" class="ui-person row-link" @click.stop>
                  <span class="ui-avatar">{{ initials(e.fullName) }}</span>
                  <span>
                    <strong>{{ e.fullName }}</strong>
                    <small>{{ e.code }}</small>
                  </span>
                </RouterLink>
              </td>
              <td>{{ e.designation || '—' }}</td>
              <td>{{ e.department || '—' }}</td>
              <td>{{ e.phone || '—' }}</td>
              <td>{{ formatDate(e.joiningDate) }}</td>
              <td>
                <span class="ui-pill" :class="e.status === 'active' ? 'success' : 'muted'">
                  {{ e.status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > PAGE_SIZE" class="pager">
        <span class="ui-muted">Showing {{ from }}–{{ to }} of {{ total }}</span>
        <div class="ui-actions">
          <button class="btn btn-ghost btn-sm" :disabled="page === 0 || loading" @click="goTo(page - 1)">‹ Previous</button>
          <button class="btn btn-ghost btn-sm" :disabled="page >= lastPage || loading" @click="goTo(page + 1)">Next ›</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.count {
  margin-bottom: 10px;
}

.row-link {
  text-decoration: none;
}

.dim {
  opacity: 0.6;
  transition: opacity 0.15s;
}

.retry {
  margin-top: 14px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}
</style>
