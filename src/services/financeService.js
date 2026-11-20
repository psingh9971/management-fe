// Finance service — mock implementation.
// Planned API: GET /api/finance/transactions?month=YYYY-MM, POST /api/finance/transactions,
//              DELETE /api/finance/transactions/:id, GET /api/finance/summary?month=YYYY-MM
import { getDb, persist, delay, clone, uid } from './mockDb'

export async function listTransactions(month) {
  await delay()
  return clone(
    getDb()
      .transactions.filter((t) => t.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date)),
  )
}

export async function addTransaction(data) {
  await delay(400)
  const t = { ...clone(data), id: uid(), amount: Number(data.amount) }
  getDb().transactions.push(t)
  persist()
  return clone(t)
}

export async function deleteTransaction(id) {
  await delay()
  const db = getDb()
  db.transactions = db.transactions.filter((t) => t.id !== id)
  persist()
}

export async function getSummary(month) {
  await delay()
  const db = getDb()
  let income = 0
  let expense = 0
  for (const t of db.transactions) {
    if (!t.date.startsWith(month)) continue
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}
