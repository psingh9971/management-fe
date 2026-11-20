<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  SOURCE_LABELS,
  attendancePercent,
  getDailyAttendance,
  getMonthSummary,
  markAttendance,
} from '../../services/attendanceService'
import { mapLimit } from '../../services/payrollService'
import { ATTENDANCE_STATUSES } from '../../services/constants'
import { initials } from '../../utils/format'
import { addDays, currentMonth, formatDate, formatMonth, todayISO } from '../../utils/date'
import { toast } from '../../stores/toast'

const TONE = { P: 'success', HD: 'warning', A: 'danger', L: 'info', WO: 'muted', H: 'info', NR: 'muted' }
const ALL_STATUSES = [...ATTENDANCE_STATUSES, { key: 'H', label: 'Holiday' }, { key: 'NR', label: 'Not marked' }]
const withTimes = (s) => s === 'P' || s === 'HD'

const tab = ref('daily')
const department = ref('')
const search = ref('')

const matches = (r) => {
  const q = search.value.trim().toLowerCase()
  return (
    (!department.value || r.department === department.value) &&
    (!q || [r.name, r.code].some((v) => String(v || '').toLowerCase().includes(q)))
  )
}

// ---------- Daily ----------
const date = ref(todayISO())
const prevDate = ref(date.value)
const day = ref({ weekday: '', timezone: '' })
const rows = ref([])
const loading = ref(true)
const saving = ref(false)
const progress = ref({ done: 0, total: 0 })
const loadError = ref('')
const note = ref('Marked from attendance register')

const departments = computed(() =>
  [...new Set([...rows.value, ...monthly.value.rows].map((r) => r.department).filter(Boolean))].sort(),
)
const visible = computed(() => rows.value.filter(matches))

function isChanged(r) {
  if (r.edit.status !== r.day.status) return true
  return withTimes(r.edit.status) && (r.edit.checkIn !== r.day.checkIn || r.edit.checkOut !== r.day.checkOut)
}
const changed = computed(() => rows.value.filter(isChanged))
const dirty = computed(() => changed.value.length > 0)

const counts = computed(() => {
  const c = Object.fromEntries(ALL_STATUSES.map((s) => [s.key, 0]))
  for (const r of visible.value) c[r.edit.status]++
  return c
})

const editOf = (d) => ({ status: d.status, checkIn: d.checkIn, checkOut: d.checkOut })

async function loadDay() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getDailyAttendance(date.value)
    day.value = { weekday: res.weekday, timezone: res.timezone }
    rows.value = res.rows
      .map((r) => ({ ...r, edit: editOf(r.day), error: '', saving: false }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

watch(date, (next) => {
  if (!next) return
  if (dirty.value && !confirm('You have unsaved attendance. Discard changes?')) {
    date.value = prevDate.value
    return
  }
  prevDate.value = next
  loadDay()
})

// Clicking the selected status again undoes the unsaved change (the API has no "unmark").
function setStatus(r, status) {
  r.error = ''
  if (r.edit.status === status) {
    r.edit = editOf(r.day)
    return
  }
  r.edit.status = status
  if (withTimes(status) && !withTimes(r.day.status)) {
    r.edit.checkIn = ''
    r.edit.checkOut = ''
  } else if (withTimes(status)) {
    r.edit.checkIn = r.day.checkIn
    r.edit.checkOut = r.day.checkOut
  }
}

function markAllPresent() {
  for (const r of visible.value) if (r.edit.status === 'NR') setStatus(r, 'P')
}

function discard() {
  for (const r of rows.value) {
    r.edit = editOf(r.day)
    r.error = ''
  }
}

function timeError(r) {
  if (!withTimes(r.edit.status)) return ''
  if (r.edit.checkIn && r.edit.checkOut && r.edit.checkOut <= r.edit.checkIn) return 'Check-out must be after check-in'
  if (r.edit.checkOut && !r.edit.checkIn) return 'Add a check-in time'
  return ''
}

function shiftDay(n) {
  const next = addDays(date.value, n)
  if (next <= todayISO()) date.value = next
}

const noteError = computed(() => (note.value.trim().length < 3 ? 'Add a reason of at least 3 characters (kept for audit)' : ''))

async function save() {
  if (noteError.value) return
  const list = changed.value.filter((r) => !timeError(r))
  if (list.length < changed.value.length) {
    toast('Fix the check-in / check-out times first', 'error')
    return
  }
  saving.value = true
  progress.value = { done: 0, total: list.length }
  const results = await mapLimit(
    list,
    4,
    async (r) => {
      r.saving = true
      r.error = ''
      try {
        const d = await markAttendance(r.employeeId, { date: date.value, ...r.edit, note: note.value })
        r.day = { ...r.day, ...d, punches: r.day.punches }
        r.edit = editOf(r.day)
      } finally {
        r.saving = false
      }
    },
    (r, res) => {
      progress.value.done++
      if (!res.ok) r.error = res.error?.message || 'Could not save'
    },
  )
  saving.value = false
  const failed = results.filter((r) => !r.ok).length
  if (failed) toast(`${list.length - failed} saved, ${failed} failed — see the highlighted rows`, 'error')
  else toast(`Attendance saved for ${formatDate(date.value)}`)
}

onBeforeRouteLeave(() => !dirty.value || confirm('You have unsaved attendance. Leave without saving?'))

// ---------- Monthly ----------
const month = ref(currentMonth())
const monthly = ref({ rows: [], loading: false, error: '' })

async function loadMonth() {
  monthly.value.loading = true
  monthly.value.error = ''
  try {
    const res = await getMonthSummary(month.value)
    monthly.value.rows = res.rows
      .filter((r) => r.isActive || r.c.P + r.c.HD + r.c.A + r.c.L > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    monthly.value.error = e.message
  } finally {
    monthly.value.loading = false
  }
}

const monthRows = computed(() => monthly.value.rows.filter(matches))

watch(month, (m) => m && loadMonth())
watch(tab, (t) => t === 'monthly' && loadMonth())

onMounted(loadDay)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Attendance</h1>
        <p class="ui-muted">Mark daily attendance and review monthly totals.</p>
      </div>
    </div>

    <div class="tabs-row">
      <div class="ui-tabs" role="tablist">
        <button :class="{ active: tab === 'daily' }" role="tab" @click="tab = 'daily'">Daily</button>
        <button :class="{ active: tab === 'monthly' }" role="tab" @click="tab = 'monthly'">Monthly summary</button>
      </div>
      <div class="filters">
        <input v-model="search" class="ui-input" type="search" placeholder="Search name or code…" aria-label="Search" />
        <select v-model="department" class="ui-input store-filter" aria-label="Filter by department">
          <option value="">All departments</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
    </div>

    <!-- DAILY -->
    <template v-if="tab === 'daily'">
      <div class="ui-toolbar">
        <button class="btn btn-ghost btn-sm" aria-label="Previous day" @click="shiftDay(-1)">‹</button>
        <input v-model="date" type="date" class="ui-input date" :max="todayISO()" aria-label="Attendance date" />
        <button class="btn btn-ghost btn-sm" aria-label="Next day" :disabled="date >= todayISO()" @click="shiftDay(1)">›</button>
        <span class="ui-muted">{{ formatDate(date) }}{{ date === todayISO() ? ' · Today' : day.weekday ? ` · ${day.weekday}` : '' }}</span>
        <span class="spacer" />
        <button class="btn btn-ghost btn-sm" :disabled="loading || saving || !counts.NR" @click="markAllPresent">
          Mark unmarked as present
        </button>
      </div>

      <div v-if="loadError" class="ui-card ui-empty">
        <strong>Couldn't load attendance</strong>
        <p>{{ loadError }}</p>
        <button class="btn btn-ghost btn-sm cta" @click="loadDay">Try again</button>
      </div>

      <template v-else>
        <div class="summary">
          <template v-for="s in ALL_STATUSES" :key="s.key">
            <span v-if="s.key !== 'H' || counts.H" class="ui-pill" :class="[TONE[s.key], { 'not-marked': s.key === 'NR' }]">
              {{ s.label }}: {{ counts[s.key] }}
            </span>
          </template>
        </div>

        <div v-if="loading" class="ui-card ui-empty">Loading…</div>

        <div v-else-if="!visible.length" class="ui-card ui-empty">
          <strong>No employees</strong>
          <p>No active employees{{ department ? ` in ${department}` : '' }}{{ search ? ' match your search' : '' }}.</p>
        </div>

        <div v-else class="rows">
          <div v-for="r in visible" :key="r.employeeId" class="row" :class="{ changed: isChanged(r), failed: r.error }">
            <div class="ui-person who">
              <span class="ui-avatar">{{ initials(r.name) }}</span>
              <span>
                <RouterLink :to="`/employees/${r.employeeId}`" class="name">{{ r.name }}</RouterLink>
                <small>{{ [r.code, r.designation, r.department].filter(Boolean).join(' · ') }}</small>
                <small v-if="r.day.status !== 'NR'" class="src">
                  {{ [SOURCE_LABELS[r.day.source], r.day.detail, r.day.workedHours ? `${r.day.workedHours} h worked` : '']
                    .filter(Boolean)
                    .join(' · ') }}
                  <template v-if="r.day.punches.length"> · Punches {{ r.day.punches.map((p) => p.time).join(', ') }}</template>
                </small>
                <small v-if="r.day.note && r.day.source === 'manual'" class="src">“{{ r.day.note }}”</small>
              </span>
            </div>

            <div class="status-col">
              <div class="status-group" role="group" :aria-label="`Attendance for ${r.name}`">
                <button
                  v-for="s in ATTENDANCE_STATUSES"
                  :key="s.key"
                  type="button"
                  class="status-btn"
                  :class="[TONE[s.key], { on: r.edit.status === s.key }]"
                  :aria-pressed="r.edit.status === s.key"
                  :disabled="r.saving"
                  @click="setStatus(r, s.key)"
                >
                  {{ s.label }}
                </button>
              </div>
              <small v-if="r.edit.status === 'H'" class="ui-muted">Holiday — pick a status to override</small>
              <small v-if="r.error" class="err">{{ r.error }}</small>
              <small v-else-if="timeError(r)" class="err">{{ timeError(r) }}</small>
            </div>

            <div class="times" :class="{ hidden: !withTimes(r.edit.status) }">
              <label>
                <span>In</span>
                <input v-model="r.edit.checkIn" type="time" class="ui-input" :disabled="r.saving" />
              </label>
              <label>
                <span>Out</span>
                <input v-model="r.edit.checkOut" type="time" class="ui-input" :disabled="r.saving" />
              </label>
            </div>
          </div>
        </div>

        <div class="save-bar">
          <label class="reason">
            <span>Reason</span>
            <input
              v-model="note"
              class="ui-input"
              maxlength="200"
              placeholder="Why this is being marked manually"
              :class="{ invalid: dirty && noteError }"
            />
          </label>
          <span v-if="saving" class="ui-muted">Saving {{ progress.done }} / {{ progress.total }}…</span>
          <span v-else-if="dirty && noteError" class="err">{{ noteError }}</span>
          <span v-else-if="dirty" class="ui-muted">{{ changed.length }} unsaved change{{ changed.length === 1 ? '' : 's' }}</span>
          <button v-if="dirty && !saving" class="btn btn-ghost" @click="discard">Discard</button>
          <button class="btn btn-primary" :disabled="!dirty || saving || !!noteError" @click="save">
            {{ saving ? 'Saving…' : 'Save attendance' }}
          </button>
        </div>
      </template>
    </template>

    <!-- MONTHLY -->
    <template v-else>
      <div class="ui-toolbar">
        <input v-model="month" type="month" class="ui-input date" :max="currentMonth()" aria-label="Month" />
        <span class="ui-muted">{{ formatMonth(month) }}</span>
      </div>

      <div v-if="monthly.loading" class="ui-card ui-empty">Loading…</div>

      <div v-else-if="monthly.error" class="ui-card ui-empty">
        <strong>Couldn't load the monthly summary</strong>
        <p>{{ monthly.error }}</p>
      </div>

      <div v-else-if="!monthRows.length" class="ui-card ui-empty">
        <strong>No attendance for this month</strong>
      </div>

      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th v-for="s in ALL_STATUSES" :key="s.key" class="num">{{ s.label }}</th>
              <th class="num">Hours</th>
              <th class="num">Attendance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in monthRows" :key="r.employeeId">
              <td>
                <RouterLink :to="`/employees/${r.employeeId}`" class="ui-person plain">
                  <span class="ui-avatar">{{ initials(r.name) }}</span>
                  <span>
                    <strong>{{ r.name }}</strong>
                    <small>{{ [r.code, r.designation].filter(Boolean).join(' · ') }}</small>
                  </span>
                </RouterLink>
              </td>
              <td v-for="s in ALL_STATUSES" :key="s.key" class="num" :class="{ 'ui-muted': !r.c[s.key] }">{{ r.c[s.key] }}</td>
              <td class="num">{{ r.c.hours ? r.c.hours.toFixed(1) : '—' }}</td>
              <td class="num">
                <strong v-if="attendancePercent(r.c) !== null" class="pct">{{ attendancePercent(r.c) }}%</strong>
                <span v-else class="ui-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="ui-muted foot">
        Attendance % = (present + ½ × half days) ÷ (present + half days + absent + leave). Week offs, holidays and unmarked
        days are excluded.
      </p>
    </template>
  </div>
</template>

<style scoped>
.tabs-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.store-filter {
  width: auto;
  min-width: 200px;
}

.ui-toolbar .date {
  min-width: 0;
  width: 170px;
}

.spacer {
  flex: 1;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.not-marked {
  border: 1px dashed var(--border);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: minmax(200px, 1.2fr) auto minmax(230px, 0.8fr);
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.who {
  min-width: 0;
}

.status-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-btn {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.status-btn:hover {
  border-color: currentColor;
}

.status-btn.success:hover, .status-btn.success.on { color: var(--success); }
.status-btn.warning:hover, .status-btn.warning.on { color: var(--warning); }
.status-btn.danger:hover, .status-btn.danger.on { color: var(--danger); }
.status-btn.info:hover, .status-btn.info.on { color: var(--info); }
.status-btn.muted:hover, .status-btn.muted.on { color: var(--text-h); }

.status-btn.on {
  border-color: currentColor;
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.times {
  display: flex;
  gap: 10px;
}

.times.hidden {
  visibility: hidden;
}

.times label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  flex: 1;
}

.times .ui-input {
  padding: 7px 8px;
}

.save-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  padding: 14px 0;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}

.plain {
  text-decoration: none;
}

.pct {
  color: var(--text-h);
}

.foot {
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .times.hidden {
    display: none;
  }
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filters .ui-input[type='search'] {
  width: 220px;
}

.cta {
  margin-top: 12px;
  display: inline-flex;
}

.row.changed {
  border-color: var(--accent-border);
}

.row.failed {
  border-color: var(--danger);
}


.name {
  display: block;
  color: var(--text-h);
  font-weight: 700;
  text-decoration: none;
}

.name:hover {
  text-decoration: underline;
}

.src {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.status-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.err {
  color: var(--danger);
  font-size: 12px;
}

.reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  font-size: 13px;
  color: var(--muted);
  flex: 1;
  max-width: 460px;
}

.reason .ui-input.invalid {
  border-color: var(--danger);
}

@media (max-width: 700px) {
  .save-bar {
    flex-wrap: wrap;
  }

  .reason {
    max-width: none;
    flex-basis: 100%;
  }
}
</style>
