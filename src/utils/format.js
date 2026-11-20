const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const formatINR = (n) => inr.format(Number(n) || 0)

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

export function maskAadhaar(v = '') {
  return v ? `XXXX XXXX ${v.slice(-4)}` : '—'
}

export function formatAadhaar(v = '') {
  return v.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function maskAccount(v = '') {
  return v ? `${'X'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : '—'
}

// 125000 -> "One Lakh Twenty Five Thousand" (Indian numbering)
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]} ${ONES[r % 10]}`.trim()
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ')
}

export function amountInWords(value) {
  let n = Math.round(Math.abs(Number(value) || 0))
  if (!n) return 'Zero'
  const parts = []
  for (const [size, name] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']]) {
    if (n >= size) {
      parts.push(`${amountInWords(Math.floor(n / size))} ${name}`)
      n %= size
    }
  }
  if (n) parts.push(below1000(n))
  return parts.join(' ')
}
