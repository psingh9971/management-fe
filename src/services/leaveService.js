// Leave types API
//   GET   /leave-types?include_inactive=bool -> LeaveTypeOut[]
//   POST  /leave-types                       (LeaveTypeCreate) -> LeaveTypeOut
//   PATCH /leave-types/{id}                  (LeaveTypeUpdate) -> LeaveTypeOut   (code can't be changed)
import { http } from './http'

export function toLeaveType(t) {
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    description: t.description || '',
    annualQuota: Number(t.annual_quota) || 0,
    isPaid: !!t.is_paid,
    isActive: !!t.is_active,
  }
}

const body = (f) => ({
  name: f.name.trim(),
  description: f.description.trim() || null,
  annual_quota: Number(f.annualQuota) || 0,
  is_paid: !!f.isPaid,
  is_active: !!f.isActive,
})

export async function listLeaveTypes({ includeInactive = false } = {}) {
  const res = await http.get(`/leave-types?include_inactive=${includeInactive}`)
  return res.map(toLeaveType)
}

export async function createLeaveType(form) {
  return toLeaveType(await http.post('/leave-types', { ...body(form), code: form.code.trim().toUpperCase() }))
}

export async function updateLeaveType(id, form) {
  return toLeaveType(await http.patch(`/leave-types/${encodeURIComponent(id)}`, body(form)))
}
