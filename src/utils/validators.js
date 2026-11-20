import { verhoeffValid } from './verhoeff'
import { ageOn } from './date'

const empty = (v) => v === '' || v === null || v === undefined

// Each rule returns an error message, or '' when valid. Optional fields pass when empty.
export const rules = {
  required: (v) => (empty(v) || (typeof v === 'string' && !v.trim()) ? 'This field is required' : ''),
  phone: (v) => (empty(v) || /^[6-9]\d{9}$/.test(v) ? '' : 'Enter a valid 10-digit mobile number'),
  email: (v) => (empty(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address'),
  aadhaar: (v) =>
    empty(v) ? '' : !/^[2-9]\d{11}$/.test(v) ? 'Aadhaar must be 12 digits' : !verhoeffValid(v) ? 'This Aadhaar number is not valid' : '',
  pan: (v) => (empty(v) || /^[A-Z]{5}\d{4}[A-Z]$/.test(v) ? '' : 'PAN format is ABCDE1234F'),
  uan: (v) => (empty(v) || /^\d{12}$/.test(v) ? '' : 'UAN must be 12 digits'),
  esic: (v) => (empty(v) || /^\d{10}(\d{7})?$/.test(v) ? '' : 'ESIC number must be 10 or 17 digits'),
  ifsc: (v) => (empty(v) || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v) ? '' : 'IFSC format is ABCD0123456'),
  account: (v) => (empty(v) || /^\d{9,18}$/.test(v) ? '' : 'Account number must be 9–18 digits'),
  upi: (v) => (empty(v) || /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v) ? '' : 'Enter a valid UPI ID (name@bank)'),
  pincode: (v) => (empty(v) || /^[1-9]\d{5}$/.test(v) ? '' : 'Pincode must be 6 digits'),
  adult: (v) => (empty(v) || ageOn(v) >= 18 ? '' : 'Employee must be at least 18 years old'),
  positive: (v) => (empty(v) || Number(v) > 0 ? '' : 'Enter an amount greater than 0'),
}

export function validateField(value, ruleNames = []) {
  for (const r of ruleNames) {
    const msg = rules[r](value)
    if (msg) return msg
  }
  return ''
}
