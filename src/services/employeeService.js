// Employee API
//   GET  /employees?skip&limit&search&department&is_active -> { items, total, skip, limit }
//   GET  /employees/{id}                                   -> EmployeeOut
//   POST /employees  (EmployeeCreate)                      -> EmployeeOut
// Update / delete endpoints don't exist yet.
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

// Suggest the next employee code (JPE-0001, JPE-0002, …) based on how many exist.
export async function suggestEmployeeCode(prefix = 'JPE-') {
  const { total } = await listEmployees({ limit: 1 })
  return `${prefix}${String(total + 1).padStart(4, '0')}`
}
