// Offer letter service — mock implementation (localStorage) until the backend endpoints exist.
// Planned API:
//   GET    /offer-letters?search&status        -> { items, total }
//   GET    /offer-letters/{id}                 -> OfferLetterOut
//   POST   /offer-letters                      -> OfferLetterOut   (server assigns ref_no)
//   PUT    /offer-letters/{id}                 -> OfferLetterOut
//   DELETE /offer-letters/{id}
// When wiring, keep the UI shape below and add toOfferLetter()/toPayload() mappers like employeeService.js.
import { delay, clone, uid } from './mockDb'

const KEY = 'jpz-offer-letters-v1'

export const COMPANY = {
  name: 'JP Enterprises',
  tagline: 'Franchise & fulfilment partner of Zepto',
  address: 'Ghaziabad, Uttar Pradesh, India',
  email: '',
  phone: '',
  website: 'jpenterprises.scholarix.co.uk',
}

export const OFFER_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'muted' },
  { value: 'issued', label: 'Issued', tone: 'info' },
  { value: 'accepted', label: 'Accepted', tone: 'success' },
  { value: 'declined', label: 'Declined', tone: 'danger' },
]

export const DEFAULT_TERMS = [
  'Your employment will be governed by the rules, policies and code of conduct of JP Enterprises as amended from time to time.',
  'Statutory deductions such as PF, ESI and Professional Tax will be made from your salary as applicable under law.',
  'Working hours and weekly offs will follow the roster of your assigned store. You may be required to work in shifts, including weekends and public holidays, as per operational needs.',
  'This offer is subject to verification of your documents (Aadhaar, PAN, bank details, address proof) and satisfactory background checks.',
  'During probation, either party may end employment with 7 days’ notice. After confirmation, the notice period is as stated above.',
  'You are expected to maintain confidentiality of all business, customer and partner (including Zepto) information during and after your employment.',
].join('\n')

// Default monthly salary split from a gross amount.
export function splitGross(gross) {
  const g = Math.max(0, Math.round(Number(gross) || 0))
  const basic = Math.round(g * 0.5)
  const hra = Math.round(g * 0.2)
  const conveyance = Math.min(1600, g - basic - hra)
  return [
    { label: 'Basic salary', amount: basic },
    { label: 'House rent allowance (HRA)', amount: hra },
    { label: 'Conveyance allowance', amount: Math.max(0, conveyance) },
    { label: 'Special allowance', amount: Math.max(0, g - basic - hra - Math.max(0, conveyance)) },
  ]
}

export const monthlyTotal = (components = []) => components.reduce((s, c) => s + (Number(c.amount) || 0), 0)

export function blankOffer() {
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const plus = (days) => iso(new Date(today.getTime() + days * 86400000))
  return {
    employeeId: '',
    candidateName: '',
    salutation: 'Mr.',
    email: '',
    phone: '',
    address: '',
    designation: '',
    department: '',
    location: '',
    employmentType: 'Full-time',
    reportingTo: '',
    shift: '',
    offerDate: iso(today),
    joiningDate: plus(7),
    acceptBy: plus(3),
    probationMonths: 3,
    noticeDays: 30,
    salary: splitGross(15000),
    terms: DEFAULT_TERMS,
    signatoryName: '',
    signatoryTitle: 'Proprietor',
    status: 'draft',
  }
}

// ---------- mock storage ----------
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

function nextRef(list, offerDate) {
  const year = (offerDate || new Date().toISOString()).slice(0, 4)
  const n = list.filter((l) => l.refNo?.includes(`/${year}/`)).length + 1
  return `JPE/OL/${year}/${String(n).padStart(4, '0')}`
}

function normalise(data) {
  const salary = (data.salary || [])
    .map((c) => ({ label: String(c.label || '').trim(), amount: Math.round(Number(c.amount) || 0) }))
    .filter((c) => c.label)
  return { ...clone(data), salary, monthlyGross: monthlyTotal(salary) }
}

export async function listOfferLetters({ search = '', status = '' } = {}) {
  await delay()
  const q = search.trim().toLowerCase()
  return readAll()
    .filter((l) => !status || l.status === status)
    .filter(
      (l) =>
        !q ||
        [l.candidateName, l.designation, l.refNo, l.location].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getOfferLetter(id) {
  await delay()
  const l = readAll().find((x) => x.id === id)
  if (!l) throw Object.assign(new Error('Offer letter not found'), { status: 404 })
  return clone(l)
}

export async function createOfferLetter(data) {
  await delay(400)
  const list = readAll()
  const now = new Date().toISOString()
  const letter = { ...normalise(data), id: uid(), refNo: nextRef(list, data.offerDate), createdAt: now, updatedAt: now }
  list.push(letter)
  writeAll(list)
  return clone(letter)
}

export async function updateOfferLetter(id, data) {
  await delay(400)
  const list = readAll()
  const i = list.findIndex((x) => x.id === id)
  if (i < 0) throw Object.assign(new Error('Offer letter not found'), { status: 404 })
  list[i] = { ...list[i], ...normalise(data), id, refNo: list[i].refNo, updatedAt: new Date().toISOString() }
  writeAll(list)
  return clone(list[i])
}

export async function setOfferStatus(id, status) {
  const current = await getOfferLetter(id)
  return updateOfferLetter(id, { ...current, status })
}

export async function deleteOfferLetter(id) {
  await delay()
  writeAll(readAll().filter((x) => x.id !== id))
}
