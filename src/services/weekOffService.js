// Week-off policies API
//   GET /week-off-policies                     -> WeekOffPolicyOut[]
//   POST /week-off-policies                    (WeekOffPolicyIn) -> WeekOffPolicyOut
//   PUT  /week-off-policies/{id}               (WeekOffPolicyIn) -> WeekOffPolicyOut
//   GET  /employees/{id}/week-off-policy       -> WeekOffPolicyOut | null
//   PUT  /employees/{id}/week-off-policy       { policy_id | null } -> WeekOffPolicyOut | null
import { http } from './http'

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th']

export const dayLabel = (d) => d[0].toUpperCase() + d.slice(1)

function joinList(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} & ${items.at(-1)}`
}

// { weekday: 'saturday', weeks_of_month: [2, 4] } -> "2nd & 4th Saturday"
export function describeRule(rule) {
  const day = dayLabel(rule.weekday)
  const weeks = rule.weeksOfMonth || []
  if (!weeks.length) return `Every ${day}`
  return `${joinList([...weeks].sort((a, b) => a - b).map((n) => ORDINAL[n]))} ${day}`
}

export function toPolicy(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    isDefault: !!p.is_default,
    rules: (p.rules || [])
      .map((r) => ({ weekday: r.weekday, weeksOfMonth: r.weeks_of_month || [] }))
      .sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday)),
  }
}

function toBody(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    is_default: !!form.isDefault,
    // weeks_of_month is omitted for "every week"
    rules: form.rules.map((r) =>
      r.weeksOfMonth.length
        ? { weekday: r.weekday, weeks_of_month: [...r.weeksOfMonth].sort((a, b) => a - b) }
        : { weekday: r.weekday },
    ),
  }
}

export async function listPolicies() {
  return (await http.get('/week-off-policies')).map(toPolicy)
}

export async function createPolicy(form) {
  return toPolicy(await http.post('/week-off-policies', toBody(form)))
}

export async function updatePolicy(id, form) {
  return toPolicy(await http.put(`/week-off-policies/${encodeURIComponent(id)}`, toBody(form)))
}

export async function getEmployeePolicy(employeeId) {
  const p = await http.get(`/employees/${encodeURIComponent(employeeId)}/week-off-policy`)
  return p ? toPolicy(p) : null
}

// policyId = null -> fall back to the default policy
export async function assignEmployeePolicy(employeeId, policyId) {
  const p = await http.put(`/employees/${encodeURIComponent(employeeId)}/week-off-policy`, {
    policy_id: policyId || null,
  })
  return p ? toPolicy(p) : null
}
