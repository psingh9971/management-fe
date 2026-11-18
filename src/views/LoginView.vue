<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { demoHint } from '../services/authService'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please enter your email and password.'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect.startsWith('/') ? redirect : '/dashboard')
  } catch (e) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

function fillDemo() {
  email.value = demoHint.email
  password.value = demoHint.password
}
</script>

<template>
  <section class="login-page">
    <div class="container">
      <form class="card" novalidate @submit.prevent="submit">
        <span class="eyebrow">Partner / Team Login</span>
        <h1>Welcome back</h1>
        <p class="muted">Sign in to manage stores, inventory and teams.</p>

        <label>
          <span>Email address</span>
          <input v-model="email" type="email" autocomplete="username" placeholder="you@jpxzepto.in" />
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

        <button class="btn btn-primary submit" type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>

        <div class="demo">
          Demo mode — no backend yet.
          <button type="button" class="link" @click="fillDemo">Use demo account</button>
        </div>
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

.demo {
  font-size: 13px;
  text-align: center;
}

.link {
  background: none;
  border: none;
  color: var(--accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .card {
    padding: 28px 20px;
  }
}
</style>
