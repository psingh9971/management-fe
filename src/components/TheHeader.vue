<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import BrandLogo from './BrandLogo.vue'

const router = useRouter()
const auth = useAuth()
const menuOpen = ref(false)

const close = () => (menuOpen.value = false)

async function logout() {
  close()
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink :to="{ path: '/', hash: '#top' }" class="brand" @click="close">
        <BrandLogo src="/logo2.png" class="header-logo" />
      </RouterLink>

      <nav class="nav" :class="{ open: menuOpen }">
        <RouterLink :to="{ path: '/', hash: '#about' }" @click="close">About</RouterLink>
        <RouterLink :to="{ path: '/', hash: '#partners' }" @click="close">Partners</RouterLink>
        <a href="#contact" @click="close">Contact</a>
        <template v-if="auth.isLoggedIn.value">
          <RouterLink to="/dashboard" class="btn btn-outline nav-login" @click="close">Dashboard</RouterLink>
          <button class="btn btn-primary nav-login" @click="logout">Logout</button>
        </template>
        <RouterLink v-else to="/login" class="btn btn-primary nav-login" @click="close">Login</RouterLink>
      </nav>

      <div class="header-actions">
        <template v-if="auth.isLoggedIn.value">
          <RouterLink to="/dashboard" class="btn btn-outline login-btn">Dashboard</RouterLink>
          <button class="btn btn-primary login-btn" @click="logout">Logout</button>
        </template>
        <RouterLink v-else to="/login" class="btn btn-primary login-btn">Login</RouterLink>
        <button class="menu-toggle" aria-label="Toggle menu" @click="menuOpen = !menuOpen">
          <span /><span /><span />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-h);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.header-logo {
  height: 64px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav a:not(.btn) {
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
}

.nav a:not(.btn):hover {
  color: var(--accent);
}

.nav-login {
  display: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  width: 16px;
  height: 2px;
  margin: 0 auto;
  background: var(--text-h);
}

@media (max-width: 760px) {
  .nav {
    position: absolute;
    top: var(--header-h);
    left: 0;
    right: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    flex-direction: column;
    align-items: stretch;
    padding: 16px 24px 24px;
    gap: 16px;
    display: none;
  }

  .nav.open {
    display: flex;
  }

  .nav-login {
    display: inline-flex;
    width: 100%;
  }

  .header-actions .login-btn {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }

  .header-logo {
    height: 52px;
  }
}
</style>
