// Attendance API
//   GET  /attendance/daily?date=YYYY-MM-DD&is_active&department&search&skip&limit(<=500) -> DailyAttendance
//   GET  /attendance/summary?month=YYYY-MM&is_active&skip&limit(<=200)                    -> MonthlyAttendanceSummary
//   GET  /employees/{id}/attendance?month=YYYY-MM                                         -> AttendanceReport
//   POST /employees/{id}/attendance/manual { date, status, check_in, check_out, note }   -> AttendanceRecordOut
//        Marking the same date again overwrites the earlier entry. `note` is required (min 3 chars, kept for audit).
//
// The UI uses short status keys (P, HD, A, L, WO, H, NR); this file maps them to the API values.
import { http } from './http'

export const STATUS_TO_API = { P: 'present', HD: 'half_day', A: 'absent', L: 'leave', WO: 'week_off', H: 'holiday', NR: 'no_record' }
const API_TO_STATUS = Object.fromEntries(Object.entries(STATUS_TO_API).map(([k, v]) => [v, k]))

export const SOURCE_LABELS = {
  manual: 'Marked manually',
  device: 'Biometric',
  leave: 'Approved leave',
  holiday: 'Holiday',
  week_off: 'Week off',
  none: '',
}

const emptyCounts = () => ({ P: 0, HD: 0, A: 0, L: 0, WO: 0, H: 0, NR: 0, hours: 0 })

function toCounts(s = {}) {
  return {
    P: s.present || 0,
    HD: s.half_day || 0,
    A: s.absent || 0,
    L: s.leave || 0,
    WO: s.week_off || 0,
    H: s.holiday || 0,
    NR: s.no_record || 0,
    hours: Number(s.total_worked_hours) || 0,
  }
}

const pad = (n) => String(n).padStart(2, '0')

// ISO datetime -> "HH:mm" in the browser's local time
export function toTimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ("2026-11-20", "09:30") -> ISO datetime with the browser's timezone applied
function toDateTime(date, time) {
  return time ? new Date(`${date}T${time}:00`).toISOString() : null
}

function toDay(a = {}) {
  return {
    status: API_TO_STATUS[a.status] || 'NR',
    source: a.source || 'none',
    checkIn: toTimeInput(a.check_in),
    checkOut: toTimeInput(a.check_out),
    workedHours: a.worked_hours ?? null,
    detail: a.detail || '',
    note: a.note || '',
    recordId: a.record_id || null,
    punches: (a.punches || []).map((p) => ({ time: toTimeInput(p.punch_time), type: p.punch_type || '' })),
  }
}

// Fetch every page of a paginated endpoint.
async function allPages(path, params, limit) {
  const items = []
  let first
  for (let skip = 0; ; skip += limit) {
    const qs = new URLSearchParams({ ...params, skip, limit })
    const res = await http.get(`${path}?${qs}`)
    first ??= res
    items.push(...(res.items || []))
    if (!res.items?.length || items.length >= (res.total ?? 0)) break
  }
  return { ...first, items }
}

// Every active employee's attendance for one day.
export async function getDailyAttendance(date) {
  const res = await allPages('/attendance/daily', { date, is_active: true }, 500)
  return {
    date: res.date,
    weekday: res.weekday || '',
    timezone: res.timezone || '',
    counts: toCounts(res.summary),
    rows: res.items.map((i) => ({
      employeeId: i.employee_id,
      code: i.employee_code || '',
      name: i.name || '',
      department: i.department || '',
      designation: i.designation || '',
      day: toDay(i.attendance),
    })),
  }
}

// Mark (or overwrite) one employee's attendance for a date. `status` is a UI key (P, HD, A, L, WO).
export async function markAttendance(employeeId, { date, status, checkIn = '', checkOut = '', note }) {
  const withTimes = status === 'P' || status === 'HD'
  const raw = await http.post(`/employees/${encodeURIComponent(employeeId)}/attendance/manual`, {
    date,
    status: STATUS_TO_API[status],
    check_in: withTimes ? toDateTime(date, checkIn) : null,
    check_out: withTimes ? toDateTime(date, checkOut) : null,
    note: note.trim(),
  })
  return toDay({ ...raw, source: raw.source || 'manual', record_id: raw.id })
}

// Monthly counts for all employees: { days, rows: [{ employeeId, code, name, department, designation, isActive, c }] }
export async function getMonthSummary(month, { activeOnly = false } = {}) {
  const res = await allPages('/attendance/summary', { month, ...(activeOnly ? { is_active: true } : {}) }, 200)
  return {
    days: res.days_in_month,
    rows: res.items.map((i) => ({
      employeeId: i.employee_id,
      code: i.employee_code || '',
      name: i.name || '',
      department: i.department || '',
      designation: i.designation || '',
      isActive: i.is_active !== false,
      c: toCounts(i.summary),
    })),
  }
}

// One employee's counts for a month.
export async function getEmployeeMonth(employeeId, month) {
  const res = await http.get(`/employees/${encodeURIComponent(employeeId)}/attendance?month=${month}`)
  return res?.summary ? toCounts(res.summary) : emptyCounts()
}

// Present = 1, half day = 0.5, over working days marked (week offs, holidays and unmarked days excluded)
export function attendancePercent(c) {
  if (!c) return null
  const working = c.P + c.HD + c.A + c.L
  return working ? Math.round(((c.P + c.HD * 0.5) / working) * 100) : null
}
