<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../stores/auth'
import { initials } from '../../utils/format'
import NavIcon from './NavIcon.vue'

defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const isEmployeeDetail = () =>
  route.path.startsWith('/employees/') &&
  !route.path.startsWith('/employees/offer-letters') &&
  !['/employees/new', '/employees/attendance', '/employees/leaves'].includes(route.path)

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', active: () => route.path === '/dashboard' },
  {
    label: 'Employees',
    icon: 'users',
    children: [
      { to: '/employees', label: 'All employees', icon: 'list', active: () => route.path === '/employees' || isEmployeeDetail() },
      { to: '/employees/new', label: 'Add employee', icon: 'add', active: () => route.path === '/employees/new' },
      { to: '/employees/attendance', label: 'Attendance', icon: 'calendar', active: () => route.path === '/employees/attendance' },
      { to: '/employees/leaves', label: 'Leaves & week offs', icon: 'leave', active: () => route.path === '/employees/leaves' },
      { to: '/employees/offer-letters', label: 'Offer letters', icon: 'document', active: () => route.path.startsWith('/employees/offer-letters') },
    ],
  },
  {
    label: 'Payroll',
    icon: 'payments',
    children: [
      { to: '/payroll', label: 'Run payroll', icon: 'payments', active: () => route.path === '/payroll' },
      { to: '/payroll/structures', label: 'Salary structures', icon: 'list', active: () => route.path.startsWith('/payroll/structures') },
      { to: '/payroll/slips', label: 'Salary slips', icon: 'document', active: () => route.path.startsWith('/payroll/slips') },
    ],
  },
  { to: '/finance', label: 'Finance', icon: 'wallet', active: () => route.path === '/finance' },
]

function logout() {
  auth.logout()
  router.push('/login')
}

const roleLabel = (u) =>
  u ? (u.isSuperAdmin ? 'Super admin' : u.role ? u.role[0].toUpperCase() + u.role.slice(1) : u.username) : ''
</script>

<template>
  <aside class="side-nav" :class="{ open }" aria-label="Main navigation">
    <div class="brand-row">
      <RouterLink to="/dashboard" class="brand">
        <img src="/logo2.png" alt="JP Enterprises" />
        <span>
          <strong>JP Enterprises</strong>
          <small>Management</small>
        </span>
      </RouterLink>
      <button class="close" aria-label="Close menu" @click="emit('close')">
        <NavIcon name="close" />
      </button>
    </div>

    <nav class="links">
      <template v-for="item in nav" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to" class="link" :class="{ active: item.active() }">
          <NavIcon :name="item.icon" />
          {{ item.label }}
        </RouterLink>
        <div v-else class="group">
          <div class="group-label">
            <NavIcon :name="item.icon" />
            {{ item.label }}
          </div>
          <RouterLink
            v-for="child in item.children"
            :key="child.to"
            :to="child.to"
            class="link sub"
            :class="{ active: child.active() }"
          >
            <NavIcon :name="child.icon" />
            {{ child.label }}
          </RouterLink>
        </div>
      </template>
    </nav>

    <div class="bottom">
      <RouterLink to="/" class="link">
        <NavIcon name="globe" />
        View website
      </RouterLink>
      <div class="user">
        <span class="ui-avatar">{{ initials(auth.user.value?.name) }}</span>
        <span class="user-text">
          <strong>{{ auth.user.value?.name }}</strong>
          <small>{{ roleLabel(auth.user.value) }}</small>
        </span>
        <button class="logout" aria-label="Log out" title="Log out" @click="logout">
          <NavIcon name="logout" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.side-nav {
  width: 256px;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-soft);
  border-right: 1px solid var(--border);
  padding: 20px 14px;
  overflow-y: auto;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand img {
  width: 48px;
  height: 48px;
}

.brand strong {
  display: block;
  color: var(--text-h);
  font-size: 16px;
  line-height: 1.2;
}

.brand small {
  color: var(--muted);
  font-size: 12px;
}

.close {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 4px;
}

.links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.link:hover {
  background: var(--accent-bg);
  color: var(--text-h);
}

.link.active {
  background: linear-gradient(135deg, rgba(176, 115, 255, 0.22), rgba(255, 111, 192, 0.14));
  color: var(--text-h);
  box-shadow: inset 3px 0 0 var(--accent);
}

.link.active svg {
  color: var(--accent);
}

.group {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.group-label svg {
  width: 16px;
  height: 16px;
}

.link.sub {
  padding-left: 22px;
}

.link.sub svg {
  width: 18px;
  height: 18px;
}

.bottom {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}

.user-text {
  flex: 1;
  min-width: 0;
}

.user-text strong,
.user-text small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-text strong {
  color: var(--text-h);
  font-size: 13px;
}

.user-text small {
  color: var(--muted);
  font-size: 11px;
}

.logout {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
}

.logout:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

@media (max-width: 900px) {
  .side-nav {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 150;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow);
  }

  .side-nav.open {
    transform: translateX(0);
  }

  .close {
    display: block;
  }
}
</style>
