// Employee API
//   GET  /employees?skip&limit&search&department&is_active -> { items, total, skip, limit }
//   GET  /employees/{id}                                   -> EmployeeOut
//   POST /employees  (EmployeeCreate)                      -> EmployeeOut
//   PATCH /employees/{id}  (EmployeeUpdate, partial)       -> EmployeeOut — only the keys sent change;
//         bank_detail / aadhaar_card / pan_card: object = create/replace, null = remove, omitted = untouched
//   DELETE /employees/{id}/soft                           -> 204 — hides + deactivates, keeps history.
//   (DELETE /employees/{id} is a super-admin hard delete that wipes all linked data; the UI never calls it.)
import { http } from './http'

const MAX_LIMIT = 200

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' }
const nn = (v) => (v === '' || v === undefined ? null : v)

// API -> UI shape
export function toEmployee(e) {
  const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ')
  return {
    id: e.id,
    code: e.employee_code,
    firstName: e.first_name,
    lastName: e.last_name || '',
    fullName,
    email: e.email || '',
    phone: e.phone || '',
    dob: e.date_of_birth || '',
    gender: e.gender || '',
    genderLabel: GENDER_LABEL[e.gender] || '',
    joiningDate: e.date_of_joining || '',
    designation: e.designation || '',
    department: e.department || '',
    address: e.address || '',
    salary: e.salary ?? null, // not returned by the API yet
    status: e.is_active ? 'active' : 'inactive',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    bank: e.bank_detail
      ? {
          accountHolder: e.bank_detail.account_holder_name,
          accountNumber: e.bank_detail.account_number,
          ifsc: e.bank_detail.ifsc_code,
          bankName: e.bank_detail.bank_name,
          branch: e.bank_detail.branch_name || '',
        }
      : null,
    aadhaar: e.aadhaar_card
      ? {
          number: e.aadhaar_card.aadhaar_number,
          name: e.aadhaar_card.name_on_card,
          dob: e.aadhaar_card.date_of_birth || '',
          address: e.aadhaar_card.address || '',
        }
      : null,
    pan: e.pan_card
      ? {
          number: e.pan_card.pan_number,
          name: e.pan_card.name_on_card,
          dob: e.pan_card.date_of_birth || '',
        }
      : null,
  }
}

// Form values -> EmployeeCreate
export function toCreatePayload(f) {
  return {
    employee_code: f.code,
    first_name: f.firstName,
    last_name: nn(f.lastName),
    email: nn(f.email),
    phone: nn(f.phone),
    date_of_birth: nn(f.dob),
    gender: nn(f.gender),
    date_of_joining: nn(f.joiningDate),
    salary: Number(f.salary),
    designation: nn(f.designation),
    department: nn(f.department),
    address: nn(f.address),
    is_active: true,
    bank_detail: {
      account_holder_name: f.accountHolder,
      account_number: f.accountNumber,
      ifsc_code: f.ifsc,
      bank_name: f.bankName,
      branch_name: nn(f.branch),
    },
    aadhaar_card: {
      aadhaar_number: f.aadhaar,
      name_on_card: f.aadhaarName,
      date_of_birth: nn(f.aadhaarDob),
      address: nn(f.aadhaarAddress),
    },
    pan_card: f.pan
      ? {
          pan_number: f.pan,
          name_on_card: f.panName,
          date_of_birth: nn(f.panDob),
        }
      : null,
  }
}

// Employee -> form values (the inverse of the mapping above). Salary isn't returned by the API.
export function toFormValues(e) {
  return {
    firstName: e.firstName, lastName: e.lastName, dob: e.dob, gender: e.gender, phone: e.phone, email: e.email,
    address: e.address, code: e.code, designation: e.designation, department: e.department,
    joiningDate: e.joiningDate, salary: '', status: e.status,
    aadhaar: e.aadhaar?.number || '', aadhaarName: e.aadhaar?.name || '', aadhaarDob: e.aadhaar?.dob || '',
    aadhaarAddress: e.aadhaar?.address || '',
    pan: e.pan?.number || '', panName: e.pan?.name || '', panDob: e.pan?.dob || '',
    accountHolder: e.bank?.accountHolder || '', bankName: e.bank?.bankName || '', branch: e.bank?.branch || '',
    accountNumber: e.bank?.accountNumber || '', confirmAccountNumber: e.bank?.accountNumber || '',
    ifsc: e.bank?.ifsc || '',
  }
}

// Form values -> EmployeeUpdate holding only what differs from `initial` (the values the form was opened with).
// Nested records (bank / Aadhaar / PAN) are sent whole when any of their fields changed.
export function toUpdatePayload(values, initial) {
  const next = { ...toCreatePayload(values), is_active: values.status !== 'inactive' }
  const prev = { ...toCreatePayload(initial), is_active: initial.status !== 'inactive' }
  if (values.salary === '' || values.salary === null || values.salary === undefined) delete next.salary
  delete prev.salary
  const out = {}
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(v) !== JSON.stringify(prev[k])) out[k] = v
  }
  return out
}

function query(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== '' && v !== null && v !== undefined) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}

const isActiveParam = (status) => (status === 'active' ? true : status === 'inactive' ? false : undefined)

// One page. Returns { items, total, skip, limit } with items mapped to the UI shape.
export async function listEmployees({ search = '', department = '', status = '', skip = 0, limit = 50 } = {}) {
  const res = await http.get(
    `/employees${query({ skip, limit, search: search.trim(), department, is_active: isActiveParam(status) })}`,
  )
  return { ...res, items: res.items.map(toEmployee) }
}

// Every matching employee (pages through the API). Use for dashboards and attendance.
export async function listAllEmployees(filters = {}) {
  const all = []
  let skip = 0
  for (;;) {
    const page = await listEmployees({ ...filters, skip, limit: MAX_LIMIT })
    all.push(...page.items)
    skip += page.items.length
    if (!page.items.length || skip >= page.total) break
  }
  return all
}

export async function getEmployee(id) {
  return toEmployee(await http.get(`/employees/${encodeURIComponent(id)}`))
}

export async function createEmployee(formValues) {
  return toEmployee(await http.post('/employees', toCreatePayload(formValues)))
}

export async function updateEmployee(id, values, initial) {
  const payload = toUpdatePayload(values, initial)
  if (!Object.keys(payload).length) return null // nothing changed
  return toEmployee(await http.patch(`/employees/${encodeURIComponent(id)}`, payload))
}

// Soft delete: the employee disappears from every list but their attendance / leave / payroll history is kept.
export async function deleteEmployee(id) {
  await http.delete(`/employees/${encodeURIComponent(id)}/soft`)
}

// Suggest the next employee code (JPE-0001, JPE-0002, …) based on how many exist.
export async function suggestEmployeeCode(prefix = 'JPE-') {
  const { total } = await listEmployees({ limit: 1 })
  return `${prefix}${String(total + 1).padStart(4, '0')}`
}
