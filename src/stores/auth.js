import { computed, reactive } from 'vue'
import * as authService from '../services/authService'
import { configureHttp } from '../services/http'

const STORAGE_KEY = 'jpz-auth'
const EMPTY = { token: null, expiresAt: 0, user: null }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.token && saved.expiresAt > Date.now()) return saved
  } catch {
    /* ignore */
  }
  return { ...EMPTY }
}

const state = reactive(load())
let expiryTimer = null
let sessionExpiredHandler = () => {}

function persist() {
  try {
    if (state.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable — session stays in memory */
  }
}

function clearSession() {
  Object.assign(state, EMPTY)
  clearTimeout(expiryTimer)
  persist()
}

function scheduleExpiry() {
  clearTimeout(expiryTimer)
  if (!state.token) return
  const ms = state.expiresAt - Date.now()
  // setTimeout can't handle delays above ~24.8 days; tokens are much shorter than that
  if (ms > 0 && ms < 2 ** 31) {
    expiryTimer = setTimeout(expire, ms)
  }
}

function expire() {
  if (!state.token) return
  clearSession()
  sessionExpiredHandler()
}

configureHttp({
  getToken: () => state.token,
  onUnauthorized: expire, // token rejected by the server → log out
})

scheduleExpiry()

// Router registers what to do when the session ends (redirect to login).
export function onSessionExpired(fn) {
  sessionExpiredHandler = fn
}

export function useAuth() {
  return {
    user: computed(() => state.user),
    isLoggedIn: computed(() => !!state.token && state.expiresAt > Date.now()),

    async login(username, password) {
      const res = await authService.login(username.trim(), password)
      state.token = res.access_token
      state.expiresAt = Date.now() + (Number(res.expires_in) || 3600) * 1000
      try {
        state.user = authService.toUser(await authService.fetchMe())
      } catch (e) {
        clearSession()
        throw e
      }
      persist()
      scheduleExpiry()
    },

    // Re-fetch /auth/me (e.g. on app load) to confirm the token is still valid.
    async refreshUser() {
      if (!state.token) return
      try {
        state.user = authService.toUser(await authService.fetchMe())
        persist()
      } catch {
        /* a 401 already logs out via onUnauthorized; network errors keep the cached user */
      }
    },

    logout() {
      clearSession()
    },
  }
}
