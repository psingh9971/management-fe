// Salary slips API
//   POST /employees/{employee_id}/salary-slips  { year, month, allow_incomplete_month, note } -> SalarySlipOut
//   GET  /employees/{employee_id}/salary-slips  -> Page<SalarySlipSummary>  (no earnings/deductions lines)
//   GET  /salary-slips/{slip_id}                -> SalarySlipOut (full slip with lines + attendance breakdown)
// The server calculates the slip from the employee's salary assignment.
// toSlip() reads SalarySlipOut / SalarySlipSummary (with a few fallbacks for older shapes).
import { http } from './http'

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '')
const pad = (n) => String(n).padStart(2, '0')

function toLine(l) {
  const amount = num(first(l.amount, l.earned_amount, l.prorated_amount, l.calculated_amount, l.value)) ?? 0
  return {
    code: l.code || l.component_code || '',
    label: first(l.name, l.component_name, l.label, l.code, l.component_code, 'Component'),
    type: String(first(l.component_type, l.type, 'earning')).toLowerCase(),
    full: num(first(l.full_amount, l.monthly_amount, l.base_amount, l.actual_amount, l.rate)) ?? amount,
    amount,
  }
}

const sum = (list, key = 'amount') => list.reduce((s, x) => s + (Number(x[key]) || 0), 0)

// API -> UI shape (what SalarySlipDocument.vue renders). `employee` is the UI employee from employeeService.
export function toSlip(raw, employee = null) {
  const r = raw || {}
  const year = num(first(r.year, r.period_year))
  const month = num(first(r.month, r.period_month))
  const period = year && month ? `${year}-${pad(month)}` : String(first(r.period, r.pay_period, '')).slice(0, 7)

  let lines = first(r.lines, r.items, r.components, r.details, r.line_items) || []
  let earnings = (r.earnings || []).map((l) => ({ ...toLine(l), type: 'earning' }))
  let deductions = (r.deductions || []).map((l) => ({ ...toLine(l), type: 'deduction' }))
  if (!earnings.length && !deductions.length && lines.length) {
    lines = lines.map(toLine)
    earnings = lines.filter((l) => l.type !== 'deduction')
    deductions = lines.filter((l) => l.type === 'deduction')
  }

  const att = r.attendance || {}
  const days = num(first(att.total_days, r.total_days, r.days_in_month, r.calendar_days, r.working_days))
  const paid = num(first(r.payable_days, att.payable_days, r.paid_days, r.days_paid, r.present_days))
  const gross = num(first(r.gross_earnings, r.gross_pay, r.gross, r.total_earnings)) ?? sum(earnings)
  const totalDeductions = num(first(r.total_deductions, r.deductions_total)) ?? sum(deductions)
  const e = employee || {}
  const re = r.employee || {}

  return {
    id: r.id,
    employeeId: first(r.employee_id, re.id, e.id),
    slipNo: first(r.slip_number, r.slip_no, r.number, year && month ? `JPE/SS/${year}-${pad(month)}/${first(e.code, r.employee_code, '')}` : ''),
    month: period,
    year,
    monthNum: month,
    status: r.status || '',
    note: r.note || '',
    daysInMonth: days ?? '—',
    paidDays: paid ?? days ?? '—',
    lopDays: num(first(r.lop_days, att.lop_days, r.loss_of_pay_days, r.unpaid_days)) ?? (days !== null && paid !== null ? +(days - paid).toFixed(1) : 0),
    earnings,
    deductions,
    fullGross: num(first(r.monthly_gross, r.fixed_gross, r.full_gross)) ?? sum(earnings, 'full'),
    gross,
    totalDeductions,
    net: num(first(r.net_pay, r.net_salary, r.net_amount, r.net)) ?? gross - totalDeductions,
    paidOn: first(r.paid_at, r.paid_on, r.payment_date, ''),
    paymentMode: first(r.payment_reference, r.payment_mode, ''),
    structureName: r.structure_name || '',
    hasLines: earnings.length + deductions.length > 0,
    generatedAt: first(r.generated_at, r.created_at, ''),
    attendance: r.attendance
      ? {
          P: att.present_days ?? 0,
          HD: att.half_days ?? 0,
          L: (Number(att.paid_leave_days) || 0) + (Number(att.unpaid_leave_days) || 0),
          WO: (att.week_off_days ?? 0) + (att.holiday_days ?? 0),
          A: att.absent_days ?? 0,
        }
      : null,
    employee: {
      name: first(e.fullName, r.employee_name, [re.first_name, re.last_name].filter(Boolean).join(' '), 'Employee'),
      code: first(e.code, re.employee_code, r.employee_code, ''),
      designation: first(e.designation, re.designation, ''),
      department: first(e.department, re.department, ''),
      joiningDate: first(e.joiningDate, re.date_of_joining, ''),
      pan: first(e.pan?.number, ''),
      bankName: first(e.bank?.bankName, ''),
      accountNumber: first(e.bank?.accountNumber, ''),
    },
    raw: r,
  }
}

// Slips generated in this session, so they can be viewed even if the list endpoint doesn't exist.
const sessionSlips = new Map() // `${employeeId}:${slipId}` -> raw

export async function generateSlip(employee, { month, allowIncompleteMonth = false, note = '' }) {
  const [y, m] = month.split('-').map(Number)
  const raw = await http.post(`/employees/${encodeURIComponent(employee.id)}/salary-slips`, {
    year: y,
    month: m,
    allow_incomplete_month: !!allowIncompleteMonth,
    note: note.trim() || null,
  })
  const slip = toSlip(raw, employee)
  if (slip.id) sessionSlips.set(`${employee.id}:${slip.id}`, raw)
  return slip
}

const byMonthDesc = (a, b) => String(b.month).localeCompare(String(a.month))

// Newest first. `supported` is false when the backend has no list endpoint — then only slips
// generated in this browser session are returned.
export async function listEmployeeSlips(employee) {
  try {
    const res = await http.get(`/employees/${encodeURIComponent(employee.id)}/salary-slips?limit=100`)
    const list = Array.isArray(res) ? res : res?.items || []
    return { supported: true, slips: list.map((r) => toSlip(r, employee)).sort(byMonthDesc) }
  } catch (e) {
    if (e.status !== 404 && e.status !== 405) throw e
    const slips = [...sessionSlips.entries()]
      .filter(([k]) => k.startsWith(`${employee.id}:`))
      .map(([, raw]) => toSlip(raw, employee))
      .sort(byMonthDesc)
    return { supported: false, slips }
  }
}

export async function getEmployeeSlip(employee, slipId) {
  const raw = await http.get(`/salary-slips/${encodeURIComponent(slipId)}`)
  sessionSlips.set(`${employee.id}:${slipId}`, raw)
  return toSlip(raw, employee)
}

// List endpoints return summaries without earnings/deductions — fetch the full slip before rendering a PDF.
export async function withLines(slips) {
  const res = await mapLimit(slips, 4, async (s) => {
    if (s.hasLines) return s
    const raw = sessionSlips.get(`${s.employeeId}:${s.id}`) || (await http.get(`/salary-slips/${encodeURIComponent(s.id)}`))
    sessionSlips.set(`${s.employeeId}:${s.id}`, raw)
    return { ...toSlip(raw), employee: s.employee, slipNo: s.slipNo }
  })
  const failed = res.find((r) => !r.ok)
  if (failed) throw failed.error
  return res.map((r) => r.value)
}

// Run async fn over items with limited parallelism. Returns results in order: { ok, value } | { ok: false, error }.
export async function mapLimit(items, limit, fn, onEach) {
  const out = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try {
        out[idx] = { ok: true, value: await fn(items[idx], idx) }
      } catch (error) {
        out[idx] = { ok: false, error }
      }
      onEach?.(items[idx], out[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export function slipFileName(s) {
  return `Salary Slip - ${s.employee.name} - ${s.month}.pdf`
}
