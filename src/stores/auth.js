import { computed, reactive } from 'vue'
import * as authService from '../services/authService'

const STORAGE_KEY = 'jpz-auth'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

const state = reactive(load())

function persist() {
  try {
    if (state.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable — session stays in memory */
  }
}

export function useAuth() {
  return {
    user: computed(() => state.user),
    isLoggedIn: computed(() => !!state.token),
    async login(email, password) {
      const { token, user } = await authService.login(email, password)
      state.token = token
      state.user = user
      persist()
    },
    async logout() {
      await authService.logout()
      state.token = null
      state.user = null
      persist()
    },
  }
}
