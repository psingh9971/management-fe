// Edit these lists to match your real stores and roles (or load them from the API later).
export const STORES = ['Store 1 — Raj Nagar', 'Store 2 — Vijay Nagar', 'Store 3 — Indirapuram']

export const DESIGNATIONS = [
  'Store Manager',
  'Shift Lead',
  'Inventory Executive',
  'Picker',
  'Packer',
  'Rider',
  'Housekeeping',
  'Security',
]

export const DEPARTMENTS = ['Operations', 'Inventory', 'Delivery', 'Administration']
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract']
export const SHIFTS = ['Morning (6 AM – 3 PM)', 'Evening (3 PM – 12 AM)', 'Night (12 AM – 9 AM)']
// value = what the API expects, label = what the user sees
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]
export const MARITAL = ['Single', 'Married', 'Other']
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
export const RELATIONS = ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Friend', 'Other']

export const ATTENDANCE_STATUSES = [
  { key: 'P', label: 'Present' },
  { key: 'HD', label: 'Half day' },
  { key: 'A', label: 'Absent' },
  { key: 'L', label: 'Leave' },
  { key: 'WO', label: 'Week off' },
]

export const INCOME_CATEGORIES = ['Zepto payout', 'Incentive', 'Other income']
export const EXPENSE_CATEGORIES = ['Salaries', 'Rent', 'Electricity', 'Fuel & transport', 'Maintenance', 'Supplies', 'Other expense']
