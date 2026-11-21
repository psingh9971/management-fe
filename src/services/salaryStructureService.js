// Salary structure API
//   GET    /salary-structures                 -> SalaryStructureOut[]
//   GET    /salary-structures/{structure_id}  -> SalaryStructureOut
//   POST   /salary-structures  (SalaryStructureIn) -> SalaryStructureOut
//   PUT    /salary-structures/{structure_id}  (SalaryStructureIn) -> replaces structure + all components;
//          already generated slips are unaffected
//   DELETE /salary-structures/{structure_id}  -> 204; only structures never assigned to anyone (422 otherwise)
//   POST   /employees/{employee_id}/salary-assignments  { structure_id, effective_from, monthly_gross }
//   GET    /employees/{employee_id}/salary-assignments
//   DELETE /employees/{employee_id}/salary-assignments/{assignment_id} -> 204; undoes the latest
//          assignment and reopens the previous one
import { http } from './http'

// Enum values. calculation_type and component_type are confirmed by the API;
// calendar_days is still a guess — adjust if the backend rejects it.
export const PRORATION_BASES = [
  { value: 'working_days', label: 'Working days' },
  { value: 'calendar_days', label: 'Calendar days' },
]
export const COMPONENT_TYPES = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
]
export const CALCULATION_TYPES = [
  { value: 'fixed', label: 'Fixed amount (₹)' },
  { value: 'percent_of_gross', label: '% of gross' },
  { value: 'percent_of_component', label: '% of a component' },
  { value: 'balance', label: 'Balance (rest of gross)' },
]

export const isPercent = (t) => t === 'percent_of_gross' || t === 'percent_of_component'
// Structures using these depend on each employee's gross pay.
export const needsGross = (components) =>
  components.some((c) => c.calcType === 'percent_of_gross' || c.calcType === 'balance')
export const SAMPLE_GROSS = 15000

export const labelOf = (list, v) => list.find((x) => x.value === v)?.label || v || '—'

// ---------- mapping ----------
function toComponent(c, i) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.component_type,
    calcType: c.calculation_type,
    value: Number(c.value) || 0, // API returns decimals as strings
    baseCode: c.base_component_code || '',
    isProrated: !!c.is_prorated,
    sequence: c.sequence ?? i,
  }
}

export function toStructure(s) {
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    prorationBasis: s.proration_basis,
    isActive: !!s.is_active,
    components: (s.components || []).map(toComponent).sort((a, b) => a.sequence - b.sequence),
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }
}

export function toCreatePayload(f) {
  return {
    name: f.name.trim(),
    description: f.description.trim() || null,
    proration_basis: f.prorationBasis,
    is_active: !!f.isActive,
    components: f.components.map((c) => ({
      code: c.code.trim().toUpperCase(),
      name: c.name.trim(),
      component_type: c.type,
      calculation_type: c.calcType,
      value: c.calcType === 'balance' ? 0 : Number(c.value) || 0,
      base_component_code: c.calcType === 'percent_of_component' ? c.baseCode : null,
      is_prorated: !!c.isProrated,
    })),
  }
}

// ---------- calls ----------
export async function listStructures() {
  const res = await http.get('/salary-structures')
  return (Array.isArray(res) ? res : res?.items || []).map(toStructure)
}

export async function getStructure(id) {
  return toStructure(await http.get(`/salary-structures/${encodeURIComponent(id)}`))
}

export async function createStructure(form) {
  return toStructure(await http.post('/salary-structures', toCreatePayload(form)))
}

export async function updateStructure(id, form) {
  return toStructure(await http.put(`/salary-structures/${encodeURIComponent(id)}`, toCreatePayload(form)))
}

export async function deleteStructure(id) {
  await http.delete(`/salary-structures/${encodeURIComponent(id)}`)
}

// ---------- employee assignments ----------
export function toAssignment(a) {
  return {
    id: a.id,
    employeeId: a.employee_id,
    structureId: a.structure_id ?? a.structure?.id,
    structure: a.structure ? toStructure(a.structure) : null,
    effectiveFrom: a.effective_from,
    effectiveTo: a.effective_to || '',
    monthlyGross: Number(a.monthly_gross) || 0, // decimals may arrive as strings
    createdAt: a.created_at,
  }
}

export async function assignStructure(employeeId, form) {
  const res = await http.post(`/employees/${encodeURIComponent(employeeId)}/salary-assignments`, {
    structure_id: form.structureId,
    effective_from: form.effectiveFrom,
    monthly_gross: Number(form.monthlyGross),
  })
  return res ? toAssignment(res) : null
}

// Only the latest assignment can be undone; the backend reopens the previous one.
export async function deleteAssignment(employeeId, assignmentId) {
  await http.delete(
    `/employees/${encodeURIComponent(employeeId)}/salary-assignments/${encodeURIComponent(assignmentId)}`,
  )
}

// Newest first. Returns null when the backend has no list endpoint.
export async function listAssignments(employeeId) {
  try {
    const res = await http.get(`/employees/${encodeURIComponent(employeeId)}/salary-assignments`)
    const list = Array.isArray(res) ? res : res?.items || []
    return list.map(toAssignment).sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)))
  } catch (e) {
    if (e.status === 404 || e.status === 405) return null
    throw e
  }
}

// The assignment in force on a date: latest effective_from on or before it.
export function currentAssignment(list, onDate) {
  return (list || []).find((a) => a.effectiveFrom <= onDate && (!a.effectiveTo || a.effectiveTo >= onDate)) || null
}

// ---------- helpers ----------
export const blankComponent = (over = {}) => ({
  code: '',
  name: '',
  type: 'earning',
  calcType: 'fixed',
  value: 0,
  baseCode: '',
  isProrated: true,
  ...over,
})

export function standardTemplate() {
  return [
    blankComponent({ code: 'BASIC', name: 'Basic Salary', calcType: 'percent_of_gross', value: 50 }),
    blankComponent({ code: 'HRA', name: 'House Rent Allowance', calcType: 'percent_of_component', value: 40, baseCode: 'BASIC' }),
    blankComponent({ code: 'CONV', name: 'Conveyance Allowance', value: 1600 }),
    blankComponent({ code: 'SPECIAL', name: 'Special Allowance', calcType: 'balance', value: 0 }),
    blankComponent({ code: 'PF', name: 'Provident Fund', type: 'deduction', calcType: 'percent_of_component', value: 12, baseCode: 'BASIC', isProrated: false }),
  ]
}

// Monthly amounts for a full month at the given gross.
//   fixed                → value
//   percent_of_gross     → value% of gross
//   percent_of_component → value% of the base component
//   balance              → gross minus every other earning (e.g. special allowance)
// Returns { rows: [{ ...component, amount, error }], earnings, deductions, net }.
export function previewStructure(components, gross = SAMPLE_GROSS) {
  const G = Math.max(0, Number(gross) || 0)
  const norm = (code) => String(code || '').trim().toUpperCase()
  const byCode = new Map(components.map((c) => [norm(c.code), c]))
  const cache = new Map()

  function calc(c, stack) {
    const code = norm(c.code)
    const v = Number(c.value) || 0
    switch (c.calcType) {
      case 'percent_of_gross':
        return { amount: Math.round((G * v) / 100), error: '' }
      case 'percent_of_component': {
        const base = resolve(norm(c.baseCode), [...stack, code])
        return { amount: Math.round((base.amount * v) / 100), error: base.error }
      }
      case 'balance': {
        if (c.type !== 'earning') return { amount: 0, error: 'Balance only works for earnings' }
        let others = 0
        let error = ''
        for (const o of components) {
          if (o === c || o.type !== 'earning') continue
          if (o.calcType === 'balance') return { amount: 0, error: 'Only one balance component allowed' }
          const r = resolve(norm(o.code), [...stack, code])
          others += r.amount
          error ||= r.error
        }
        if (others > G) return { amount: 0, error: `Other earnings exceed gross by ₹${(others - G).toLocaleString('en-IN')}` }
        return { amount: G - others, error }
      }
      default:
        return { amount: Math.round(v), error: '' }
    }
  }

  function resolve(code, stack = []) {
    if (cache.has(code)) return cache.get(code)
    const c = byCode.get(code)
    if (!c) return { amount: 0, error: `Base “${code || '—'}” not found` }
    if (stack.includes(code)) return { amount: 0, error: 'Circular reference' }
    const out = calc(c, [...stack, code])
    cache.set(code, out)
    return out
  }

  const rows = components.map((c) => ({ ...c, ...resolve(norm(c.code)) }))
  const earnings = rows.filter((r) => r.type === 'earning').reduce((s, r) => s + r.amount, 0)
  const deductions = rows.filter((r) => r.type === 'deduction').reduce((s, r) => s + r.amount, 0)
  return { rows, earnings, deductions, net: earnings - deductions }
}

export function describeComponent(c) {
  switch (c.calcType) {
    case 'fixed':
      return `₹${Number(c.value).toLocaleString('en-IN')} fixed`
    case 'percent_of_gross':
      return `${c.value}% of gross`
    case 'percent_of_component':
      return `${c.value}% of ${c.baseCode || '—'}`
    case 'balance':
      return 'Balance of gross'
    default:
      return `${c.calcType}: ${c.value}`
  }
}
