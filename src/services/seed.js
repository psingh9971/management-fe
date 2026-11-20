// Sample data for the mock database. Remove once the real API is connected.
import { verhoeffDigit } from '../utils/verhoeff'
import { addDays, todayISO, currentMonth } from '../utils/date'
import { STORES } from './constants'

const aadhaar = (base11) => base11 + verhoeffDigit(base11)

// name, father, gender, designation, department, store index, salary, bank, IFSC
const people = [
  ['Amit Sharma', 'Rakesh Sharma', 'Male', 'Store Manager', 'Operations', 0, 32000, 'HDFC Bank', 'HDFC0001234'],
  ['Neha Gupta', 'Suresh Gupta', 'Female', 'Shift Lead', 'Operations', 1, 24000, 'State Bank of India', 'SBIN0004567'],
  ['Pooja Verma', 'Anil Verma', 'Female', 'Inventory Executive', 'Inventory', 0, 22000, 'ICICI Bank', 'ICIC0002345'],
  ['Rahul Kumar', 'Mahesh Kumar', 'Male', 'Picker', 'Operations', 0, 15000, 'Punjab National Bank', 'PUNB0123400'],
  ['Vikas Chauhan', 'Ramesh Chauhan', 'Male', 'Packer', 'Operations', 1, 14500, 'State Bank of India', 'SBIN0007788'],
  ['Sandeep Yadav', 'Om Prakash Yadav', 'Male', 'Rider', 'Delivery', 2, 18000, 'Bank of Baroda', 'BARB0GHAZIA'],
  ['Arjun Singh', 'Harpal Singh', 'Male', 'Rider', 'Delivery', 2, 18000, 'HDFC Bank', 'HDFC0005566'],
  ['Kavita Rawat', 'Dinesh Rawat', 'Female', 'Picker', 'Operations', 1, 15000, 'Axis Bank', 'UTIB0001122'],
]

const PAN_4TH = 'PQRSTUVW'
const PAN_LAST = 'FGHJKLMN'

function hash(str) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const digits = (n, len) => String(n).padStart(len, '0').slice(-len)

export function seedDb() {
  const today = todayISO()

  const employees = people.map((row, i) => {
    const [fullName, fatherName, gender, designation, department, storeIdx, salary, bankName, ifsc] = row
    const n = i + 1
    const first = fullName.split(' ')[0].toLowerCase()
    const morning = i % 2 === 0
    return {
      id: `emp${n}`,
      code: `JPE-${digits(n, 4)}`,
      status: i === 7 ? 'inactive' : 'active',
      createdAt: new Date(Date.now() - (people.length - i) * 86400000).toISOString(),
      // Personal
      fullName,
      fatherName,
      dob: `${1990 + i}-${digits((i % 9) + 1, 2)}-${digits(10 + i, 2)}`,
      gender,
      maritalStatus: i % 3 === 0 ? 'Married' : 'Single',
      bloodGroup: ['B+', 'O+', 'A+', 'AB+'][i % 4],
      phone: `98${digits(10000000 + i * 1234567, 8)}`,
      altPhone: '',
      email: i < 3 ? `${first}@example.com` : '',
      currentAddress: `House ${100 + i * 7}, Sector ${10 + i}, Ghaziabad, Uttar Pradesh`,
      permanentAddress: `House ${100 + i * 7}, Sector ${10 + i}, Ghaziabad, Uttar Pradesh`,
      pincode: '201001',
      // Employment
      designation,
      department,
      store: STORES[storeIdx],
      joiningDate: addDays(today, -(400 - i * 45)),
      employmentType: designation === 'Rider' ? 'Contract' : 'Full-time',
      shift: morning ? 'Morning (6 AM – 3 PM)' : 'Evening (3 PM – 12 AM)',
      salary,
      reportingTo: i === 0 ? '' : 'Amit Sharma',
      // KYC
      aadhaar: aadhaar(`${4 + (i % 5)}${digits(1234567890 + i * 98765431, 10)}`),
      pan: `ABC${PAN_4TH[i]}${fullName[0]}${1234 + i}${PAN_LAST[i]}`,
      uan: i < 5 ? `1009${digits(87654321 + i * 1111, 8)}` : '',
      esic: i < 5 ? `69${digits(12345678 + i * 2222, 8)}` : '',
      // Bank
      accountHolder: fullName,
      bankName,
      accountNumber: String(50100000000 + i * 7654321),
      ifsc,
      branch: 'Ghaziabad Main',
      upi: i % 2 === 0 ? `${first}@okaxis` : '',
      // Emergency
      emergencyName: fatherName,
      emergencyRelation: 'Father',
      emergencyPhone: `97${digits(20000000 + i * 7654321, 8)}`,
      documents: {},
    }
  })

  // Attendance for the last 14 days (today is left unmarked)
  const attendance = {}
  for (let back = 14; back >= 1; back--) {
    const date = addDays(today, -back)
    const weekday = new Date(date + 'T00:00:00').getDay()
    attendance[date] = {}
    employees
      .filter((e) => e.status === 'active' && e.joiningDate <= date)
      .forEach((e, idx) => {
        const r = hash(date + e.id) % 20
        const status = weekday === idx % 7 ? 'WO' : r < 15 ? 'P' : r < 17 ? 'HD' : r < 19 ? 'A' : 'L'
        const morning = e.shift.startsWith('Morning')
        const worked = status === 'P' || status === 'HD'
        attendance[date][e.id] = {
          status,
          checkIn: worked ? (morning ? '06:0' : '15:0') + (r % 10) : '',
          checkOut: status === 'P' ? (morning ? '15:0' : '23:5') + (r % 10) : status === 'HD' ? (morning ? '10:30' : '19:30') : '',
        }
      })
  }

  // Transactions for this month (up to today) and last month
  const month = currentMonth()
  const [y, m] = month.split('-').map(Number)
  const prev = `${m === 1 ? y - 1 : y}-${digits(m === 1 ? 12 : m - 1, 2)}`
  const transactions = []
  for (const mon of [prev, month]) {
    const maxDay = mon === month ? Number(today.slice(8)) : 31
    const add = (day, type, category, amount, note) => {
      if (day > maxDay) return
      transactions.push({ id: `tx-${mon}-${day}`, date: `${mon}-${digits(day, 2)}`, type, category, amount, note })
    }
    add(1, 'expense', 'Rent', 95000, 'Store rent — all stores')
    add(5, 'income', 'Zepto payout', 412000, 'Weekly payout')
    add(7, 'expense', 'Salaries', 158500, 'Monthly payroll')
    add(10, 'expense', 'Electricity', 38400, 'Electricity bills')
    add(12, 'income', 'Zepto payout', 398500, 'Weekly payout')
    add(15, 'expense', 'Fuel & transport', 12600, 'Rider fuel reimbursements')
    add(18, 'income', 'Incentive', 45000, 'SLA incentive')
    add(19, 'income', 'Zepto payout', 405200, 'Weekly payout')
    add(22, 'expense', 'Maintenance', 8700, 'AC servicing')
    add(26, 'income', 'Zepto payout', 421800, 'Weekly payout')
    add(27, 'expense', 'Supplies', 6400, 'Packing supplies')
  }

  return { seq: employees.length, employees, attendance, transactions }
}
