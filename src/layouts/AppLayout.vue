<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SideNav from '../components/app/SideNav.vue'
import NavIcon from '../components/app/NavIcon.vue'
import ToastHost from '../components/app/ToastHost.vue'
import { useAuth } from '../stores/auth'
import '../styles/app.css'

const route = useRoute()
const navOpen = ref(false)
const auth = useAuth()

// Confirm the saved token is still valid and load the latest profile
onMounted(() => auth.refreshUser())

watch(
  () => route.fullPath,
  () => (navOpen.value = false),
)
</script>

<template>
  <div class="app-shell">
    <SideNav :open="navOpen" @close="navOpen = false" />
    <div v-if="navOpen" class="nav-backdrop" @click="navOpen = false" />

    <div class="app-main">
      <header class="app-topbar">
        <button class="menu-btn" aria-label="Open menu" @click="navOpen = true">
          <NavIcon name="menu" />
        </button>
        <img src="/logo2.png" alt="JP Enterprises" class="topbar-logo" />
        <span class="topbar-title">{{ route.meta.title }}</span>
      </header>

      <main class="app-content">
        <RouterView :key="route.fullPath" />
      </main>
    </div>

    <ToastHost />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-content {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px 40px 64px;
}

.app-topbar {
  display: none;
}

.nav-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .app-topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 60px;
    padding: 0 16px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }

  .menu-btn {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-soft);
    color: var(--text-h);
    cursor: pointer;
  }

  .topbar-logo {
    width: 32px;
    height: 32px;
  }

  .topbar-title {
    font-weight: 700;
    color: var(--text-h);
  }

  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 140;
    background: rgba(5, 3, 10, 0.6);
  }

  .app-content {
    padding: 20px 16px 48px;
  }
}
</style>
