// In-browser mock database — used until the real API endpoints are connected.
// Data lives in localStorage so it survives refreshes. Reset it with resetMockDb().
import { seedDb } from './seed'

const KEY = 'jpz-mock-db-v1'
let db = null

function load() {
  try {
    db = JSON.parse(localStorage.getItem(KEY))
  } catch {
    db = null
  }
  if (!db) {
    db = seedDb()
    persist()
  }
}

export function getDb() {
  if (!db) load()
  return db
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable — keep in memory */
  }
}

export function resetMockDb() {
  db = seedDb()
  persist()
}

export const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))
export const clone = (x) => JSON.parse(JSON.stringify(x))
export const uid = () => Math.random().toString(36).slice(2, 10)
