<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { fetchCurrentTenant } from '../services/authService'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const tenant = ref(null)
const tenantLoading = ref(true)
const tenantError = ref('')

async function loadTenant() {
  tenantLoading.value = true
  tenantError.value = ''
  try {
    tenant.value = await fetchCurrentTenant()
  } catch (e) {
    tenant.value = null
    tenantError.value = e.message || 'Could not identify your organisation.'
  } finally {
    tenantLoading.value = false
  }
}

onMounted(loadTenant)

async function submit() {
  error.value = ''
  if (!tenant.value?.id) {
    error.value = 'Organisation could not be identified. Please reload and try again.'
    return
  }
  if (!username.value.trim() || !password.value) {
    error.value = 'Please enter your username and password.'
    return
  }
  loading.value = true
  try {
    await auth.login(tenant.value.id, username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect.startsWith('/') ? redirect : '/dashboard')
  } catch (e) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="container">
      <form class="card" novalidate @submit.prevent="submit">
        <span class="eyebrow">Partner / Team Login</span>
        <h1>Welcome back</h1>
        <p v-if="tenantLoading" class="tenant muted">Loading organisation…</p>
        <p v-else-if="tenant" class="tenant">{{ tenant.name }}</p>
        <p v-else class="error" role="alert">
          {{ tenantError }}
          <button type="button" class="retry" @click="loadTenant">Retry</button>
        </p>
        <p class="muted">Sign in to manage stores, inventory and teams.</p>

        <p v-if="route.query.expired" class="info" role="status">Your session has ended. Please sign in again.</p>

        <label>
          <span>Username</span>
          <input v-model="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" />
        </label>

        <label>
          <span>Password</span>
          <div class="pw">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button type="button" class="toggle" @click="showPassword = !showPassword">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button class="btn btn-primary submit" type="submit" :disabled="loading || tenantLoading || !tenant">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - var(--header-h));
  display: flex;
  align-items: center;
  background:
    radial-gradient(60% 60% at 80% 0%, var(--accent-bg), transparent 70%),
    radial-gradient(50% 50% at 0% 100%, rgba(255, 46, 159, 0.08), transparent 70%);
  padding: 56px 0;
}

.card {
  width: 420px;
  max-width: 100%;
  margin: 0 auto;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 36px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: stretch;
}

.card .eyebrow {
  align-self: flex-start;
}

h1 {
  font-size: 28px;
  margin-top: 4px;
}

.tenant {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  margin-top: -4px;
}

.tenant.muted {
  color: inherit;
  font-weight: 400;
}

.retry {
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 0 0 6px;
}

.muted {
  font-size: 14px;
  margin-bottom: 6px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
}

input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-h);
  font: inherit;
  font-weight: 400;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.pw {
  position: relative;
}

.pw input {
  padding-right: 64px;
}

.toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 6px;
}

.error {
  color: #e5484d;
  font-size: 14px;
  background: rgba(229, 72, 77, 0.08);
  border: 1px solid rgba(229, 72, 77, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
}

.submit {
  margin-top: 6px;
}

.submit:disabled {
  opacity: 0.7;
  cursor: progress;
}

.info {
  font-size: 14px;
  color: var(--text-h);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 10px 12px;
}

@media (max-width: 480px) {
  .card {
    padding: 28px 20px;
  }
}
</style>
