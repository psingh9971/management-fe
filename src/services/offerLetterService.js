// Offer letters API
//   POST  /employees/{employee_id}/offer-letters   OfferLetterCreate -> OfferLetterOut  (status "provisional")
//   GET   /employees/{employee_id}/offer-letters   ?skip&limit       -> Page<OfferLetterOut>
//   GET   /offer-letters                           ?status&skip&limit -> Page<OfferLetterOut>
//   GET   /offer-letters/{id}                                         -> OfferLetterOut
//   PATCH /offer-letters/{id}                      OfferLetterUpdate -> OfferLetterOut  (provisional letters only)
//   POST  /offer-letters/{id}/confirm              { joining_date, update_employee_joining_date }
//   POST  /offer-letters/{id}/withdraw             { reason (min 3) }
// The salary breakdown is read by the server from the employee's current salary assignment
// (also on every PATCH), and the candidate name comes from the employee record.
import { http } from './http'
import { todayISO, addDays } from '../utils/date'

export const COMPANY = {
  name: 'JP Enterprises',
  tagline: 'Franchise & fulfilment partner of Zepto',
  address: 'Ghaziabad, Uttar Pradesh, India',
  email: '',
  phone: '',
  website: 'jpenterprises.scholarix.co.uk',
}

export const OFFER_STATUSES = [
  { value: 'provisional', label: 'Provisional', tone: 'warning' },
  { value: 'confirmed', label: 'Confirmed', tone: 'success' },
  { value: 'withdrawn', label: 'Withdrawn', tone: 'muted' },
]

export const DEFAULT_TERMS = [
  'Your employment will be governed by the rules, policies and code of conduct of JP Enterprises as amended from time to time.',
  'You will be on probation for 3 months from your date of joining. During probation, either party may end employment with 7 days’ notice; after confirmation, the notice period is 30 days.',
  'Statutory deductions such as PF, ESI and Professional Tax will be made from your salary as applicable under law.',
  'Working hours and weekly offs will follow the roster of your assigned store. You may be required to work in shifts, including weekends and public holidays, as per operational needs.',
  'This offer is subject to verification of your documents (Aadhaar, PAN, bank details, address proof) and satisfactory background checks.',
  'You are expected to maintain confidentiality of all business, customer and partner (including Zepto) information during and after your employment.',
].join('\n')

// ---------- signatory (an org-wide setting, not stored on the letter by the API) ----------
const SIGN_KEY = 'jpz-offer-signatory-v1'

// `signature` is a transparent PNG data URL (drawn or uploaded in SignaturePad.vue), or ''.
export function getSignatory() {
  const defaults = { name: '', title: 'Proprietor', signature: '' }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SIGN_KEY) || '{}') }
  } catch {
    return defaults
  }
}

export function saveSignatory(s) {
  const signature = typeof s.signature === 'string' && s.signature.startsWith('data:image/') ? s.signature : ''
  try {
    localStorage.setItem(SIGN_KEY, JSON.stringify({ name: s.name || '', title: s.title || '', signature }))
  } catch {
    /* storage unavailable or full */
  }
}

// ---------- mapping ----------
const num = (v) => Number(v) || 0
const toLine = (c) => ({ code: c.code, label: c.name || c.code, amount: num(c.monthly), annual: num(c.annual) })

// OfferLetterOut -> UI shape used by OfferLetterDocument.vue and the views.
export function toOfferLetter(r) {
  return {
    id: r.id,
    refNo: r.letter_number || '',
    employeeId: r.employee_id,
    employeeCode: r.employee_code || '',
    status: r.status,
    candidateName: r.candidate_name || '',
    designation: r.designation || '',
    department: r.department || '',
    location: r.work_location || '',
    offerDate: r.offer_date || '',
    tentativeJoiningDate: r.tentative_joining_date || '',
    confirmedJoiningDate: r.joining_date || '',
    joiningDate: r.joining_date || r.tentative_joining_date || '',
    joiningTentative: !r.joining_date,
    acceptBy: r.valid_until || '',
    structureName: r.structure_name || '',
    salary: (r.earnings || []).map(toLine),
    deductions: (r.deductions || []).map(toLine).filter((d) => d.amount > 0),
    monthlyGross: num(r.monthly_gross),
    annualGross: num(r.annual_gross),
    monthlyDeductions: num(r.monthly_deductions),
    monthlyNet: num(r.monthly_net),
    terms: r.terms || '',
    confirmedAt: r.confirmed_at || '',
    withdrawnAt: r.withdrawn_at || '',
    withdrawalReason: r.withdrawal_reason || '',
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  }
}

const orNull = (v) => (String(v ?? '').trim() ? String(v).trim() : null)

function toBody(f, { create }) {
  const body = {
    designation: orNull(f.designation),
    department: orNull(f.department),
    work_location: orNull(f.location),
    tentative_joining_date: f.tentativeJoiningDate || null,
    valid_until: f.acceptBy || null,
    terms: orNull(f.terms),
  }
  if (create) body.offer_date = f.offerDate || null
  return body
}

export function blankOffer() {
  const today = todayISO()
  return {
    employeeId: '',
    designation: '',
    department: '',
    location: '',
    offerDate: today,
    tentativeJoiningDate: addDays(today, 7),
    acceptBy: addDays(today, 3),
    terms: DEFAULT_TERMS,
  }
}

// ---------- API ----------
async function allPages(path, params = {}) {
  const items = []
  for (let skip = 0; ; skip += 200) {
    const qs = new URLSearchParams({ ...params, skip, limit: 200 })
    const res = await http.get(`${path}?${qs}`)
    items.push(...(res.items || []))
    if (!res.items?.length || items.length >= (res.total ?? 0)) break
  }
  return items
}

const newestFirst = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')

export async function listOfferLetters({ status = '' } = {}) {
  const items = await allPages('/offer-letters', status ? { status } : {})
  return items.map(toOfferLetter).sort(newestFirst)
}

export async function listEmployeeOfferLetters(employeeId) {
  const items = await allPages(`/employees/${encodeURIComponent(employeeId)}/offer-letters`)
  return items.map(toOfferLetter).sort(newestFirst)
}

export async function getOfferLetter(id) {
  return toOfferLetter(await http.get(`/offer-letters/${encodeURIComponent(id)}`))
}

export async function createOfferLetter(employeeId, form) {
  const raw = await http.post(`/employees/${encodeURIComponent(employeeId)}/offer-letters`, toBody(form, { create: true }))
  return toOfferLetter(raw)
}

export async function updateOfferLetter(id, form) {
  return toOfferLetter(await http.patch(`/offer-letters/${encodeURIComponent(id)}`, toBody(form, { create: false })))
}

export async function confirmOfferLetter(id, { joiningDate, updateEmployeeJoiningDate = true }) {
  const raw = await http.post(`/offer-letters/${encodeURIComponent(id)}/confirm`, {
    joining_date: joiningDate,
    update_employee_joining_date: !!updateEmployeeJoiningDate,
  })
  return toOfferLetter(raw)
}

export async function withdrawOfferLetter(id, reason) {
  return toOfferLetter(await http.post(`/offer-letters/${encodeURIComponent(id)}/withdraw`, { reason: reason.trim() }))
}

// The salary a new letter will carry: GET /employees/{id}/salary-assignments/current.
// Returns null when the employee has no salary assigned.
export async function getOfferSalary(employeeId) {
  try {
    const res = await http.get(`/employees/${encodeURIComponent(employeeId)}/salary-assignments/current`)
    if (!res?.assignment) return null
    const comps = res.breakdown?.components || []
    const line = (c) => ({ code: c.code, label: c.name || c.code, amount: num(c.amount), annual: num(c.amount) * 12 })
    const gross = num(res.breakdown?.gross_earnings ?? res.assignment.monthly_gross)
    const ded = num(res.breakdown?.total_deductions)
    return {
      structureName: res.assignment.structure_name || '',
      salary: comps.filter((c) => c.component_type !== 'deduction').map(line),
      deductions: comps.filter((c) => c.component_type === 'deduction').map(line).filter((d) => d.amount > 0),
      monthlyGross: gross,
      annualGross: gross * 12,
      monthlyDeductions: ded,
      monthlyNet: num(res.breakdown?.net_pay) || gross - ded,
    }
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

// Fields printed on the letter that the offer-letter API doesn't store: the employee's contact
// details (from the employee record) and the org-wide signatory.
export function forDocument(letter, employee = null, signatory = getSignatory()) {
  const e = employee || {}
  return {
    ...letter,
    candidateName: letter.candidateName || e.fullName || '',
    salutation: e.gender === 'female' ? 'Ms.' : e.gender === 'male' ? 'Mr.' : '',
    address: e.address || '',
    phone: e.phone || '',
    email: e.email || '',
    signatoryName: signatory.name,
    signatoryTitle: signatory.title,
    signatorySignature: signatory.signature || '',
  }
}
