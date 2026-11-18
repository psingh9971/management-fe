<script setup>
import { useAuth } from '../stores/auth'

const { user } = useAuth()

const modules = [
  { title: 'Stores', text: 'Store list, SLAs and daily performance.' },
  { title: 'Inventory', text: 'Stock levels, inwarding and shrinkage.' },
  { title: 'Team', text: 'Staff, shifts and attendance.' },
]
</script>

<template>
  <section class="dashboard">
    <div class="container">
      <span class="eyebrow">Dashboard</span>
      <h1>Hi, {{ user?.name?.split(' ')[0] }} 👋</h1>
      <p class="muted">{{ user?.role }} · {{ user?.email }}</p>

      <div class="grid">
        <article v-for="m in modules" :key="m.title" class="card">
          <h3>{{ m.title }}</h3>
          <p>{{ m.text }}</p>
          <span class="soon">Coming soon</span>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  min-height: calc(100vh - var(--header-h));
  padding: 56px 0;
}

h1 {
  font-size: clamp(28px, 4vw, 38px);
  margin: 16px 0 6px;
}

.grid {
  margin-top: 36px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card h3 {
  font-size: 19px;
}

.soon {
  align-self: flex-start;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-bg);
  border-radius: 999px;
  padding: 4px 10px;
}
</style>
