// Auth service — mock implementation until the backend API is ready.
// Swap `login` for a real call (e.g. POST /api/auth/login) that returns { token, user }.
// NOTE: demo credentials live in the frontend only for now; never ship real passwords here.

const DEMO_PASSWORD = 'demo1234'

const DEMO_USERS = [
  { id: 1, name: 'Parvinder Singh', email: 'parvinder@jpxzepto.in', role: 'Partner — Technology' },
  { id: 2, name: 'Jaideep Singh', email: 'jaideep@jpxzepto.in', role: 'Partner — Inventory & Warehousing' },
  { id: 3, name: 'Eklavya Dixit', email: 'eklavya@jpxzepto.in', role: 'Partner — Franchise Operations' },
]

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function login(email, password) {
  await wait(600)
  const user = DEMO_USERS.find((u) => u.email === email.trim().toLowerCase())
  if (!user || password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password.')
  }
  return { token: `demo-${user.id}-${Date.now()}`, user }
}

export async function logout() {
  await wait(150)
}

export const demoHint = { email: DEMO_USERS[0].email, password: DEMO_PASSWORD }
