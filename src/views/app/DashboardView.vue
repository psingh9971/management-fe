<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../stores/auth'
import { listAllEmployees } from '../../services/employeeService'
import { getDailyAttendance } from '../../services/attendanceService'
import { ATTENDANCE_STATUSES } from '../../services/constants'
import { initials } from '../../utils/format'
import { formatDate, todayISO } from '../../utils/date'

const { user } = useAuth()
const TONE = { P: 'success', HD: 'warning', A: 'danger', L: 'info', WO: 'muted' }

const loading = ref(true)
const employees = ref([])
const today = ref(null) // counts from GET /attendance/daily
const error = ref('')

const active = computed(() => employees.value.filter((e) => e.status === 'active'))
const recent = computed(() =>
  [...employees.value].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5),
)
const todayCounts = computed(() => today.value || { P: 0, HD: 0, A: 0, L: 0, WO: 0, H: 0, NR: 0 })
const markedToday = computed(() => {
  const c = todayCounts.value
  return c.P + c.HD + c.A + c.L > 0
})

const greeting = (() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})()

onMounted(async () => {
  try {
    const [emps, att] = await Promise.all([listAllEmployees(), getDailyAttendance(todayISO())])
    employees.value = emps
    today.value = att.counts
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>{{ greeting }}, {{ user?.name?.split(' ')[0] }}</h1>
        <p class="ui-muted">{{ formatDate(todayISO()) }} · Here's what's happening across your stores.</p>
      </div>
      <div class="ui-actions">
        <RouterLink to="/employees/attendance" class="btn btn-ghost">Mark attendance</RouterLink>
        <RouterLink to="/employees/new" class="btn btn-primary">+ Add employee</RouterLink>
      </div>
    </div>

    <p v-if="error" class="ui-card error-box">Couldn't load dashboard data: {{ error }}</p>

    <div class="ui-tiles" :class="{ dim: loading }">
      <RouterLink to="/employees" class="ui-tile link-tile">
        <span class="ui-tile-label">Active employees</span>
        <span class="ui-tile-value">{{ active.length }}</span>
        <span class="ui-tile-sub">{{ employees.length - active.length }} inactive</span>
      </RouterLink>
      <RouterLink to="/employees/attendance" class="ui-tile link-tile">
        <span class="ui-tile-label">Present today</span>
        <span class="ui-tile-value">
          {{ markedToday ? todayCounts.P + todayCounts.HD : '—' }}<small v-if="markedToday"> / {{ active.length }}</small>
        </span>
        <span class="ui-tile-sub">
          {{ markedToday ? `${todayCounts.A} absent · ${todayCounts.L} on leave · ${todayCounts.NR} not marked` : 'Not marked yet' }}
        </span>
      </RouterLink>
    </div>

    <div class="cols">
      <div class="ui-card">
        <div class="ui-card-head">
          <h2>Today's attendance</h2>
          <RouterLink to="/employees/attendance" class="btn btn-ghost btn-sm">Open</RouterLink>
        </div>
        <div v-if="!loading && !markedToday" class="notice">
          <p>Attendance for today hasn't been marked yet.</p>
          <RouterLink to="/employees/attendance" class="btn btn-primary btn-sm">Mark now</RouterLink>
        </div>
        <ul v-else class="att-list">
          <li v-for="s in ATTENDANCE_STATUSES" :key="s.key">
            <span class="ui-pill" :class="TONE[s.key]">{{ s.label }}</span>
            <strong>{{ todayCounts[s.key] }}</strong>
          </li>
          <li>
            <span class="ui-pill muted">Not marked</span>
            <strong>{{ todayCounts.NR }}</strong>
          </li>
        </ul>
      </div>

      <div class="ui-card">
        <div class="ui-card-head">
          <h2>Recently added employees</h2>
          <RouterLink to="/employees" class="btn btn-ghost btn-sm">View all</RouterLink>
        </div>
        <p v-if="!loading && !recent.length" class="ui-muted">No employees yet.</p>
        <ul class="people">
          <li v-for="e in recent" :key="e.id">
            <RouterLink :to="`/employees/${e.id}`" class="ui-person plain">
              <span class="ui-avatar">{{ initials(e.fullName) }}</span>
              <span>
                <strong>{{ e.fullName }}</strong>
                <small>{{ [e.designation, e.department].filter(Boolean).join(' · ') || e.code }}</small>
              </span>
            </RouterLink>
            <span class="ui-pill" :class="e.status === 'active' ? 'success' : 'muted'">
              {{ e.status === 'active' ? 'Active' : 'Inactive' }}
            </span>
          </li>
        </ul>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dim {
  opacity: 0.6;
}

.error-box {
  color: var(--danger);
  margin-bottom: 20px;
}

.link-tile {
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;
}

.link-tile:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
}

.ui-tile-value small {
  font-size: 15px;
  color: var(--muted);
  font-weight: 600;
}

.cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.cols .ui-card + .ui-card {
  margin-top: 0;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px;
  border-radius: 12px;
  background: var(--warning-bg);
  color: var(--text-h);
  font-size: 14px;
}

.att-list,
.people {
  list-style: none;
  margin: 0;
  padding: 0;
}

.att-list li,
.people li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.att-list li:last-child,
.people li:last-child {
  border-bottom: none;
}

.att-list strong {
  color: var(--text-h);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.plain {
  text-decoration: none;
  min-width: 0;
}


@media (max-width: 900px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
