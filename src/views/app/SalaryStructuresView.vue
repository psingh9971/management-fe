<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  labelOf,
  listStructures,
  needsGross,
  SAMPLE_GROSS,
  previewStructure,
  PRORATION_BASES,
} from '../../services/salaryStructureService'
import { formatINR } from '../../utils/format'
import { formatDate } from '../../utils/date'

const router = useRouter()
const structures = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const showInactive = ref(false)

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return structures.value
    .filter((s) => showInactive.value || s.isActive)
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    .map((s) => ({ ...s, usesGross: needsGross(s.components), preview: previewStructure(s.components) }))
})
const inactiveCount = computed(() => structures.value.filter((s) => !s.isActive).length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    structures.value = await listStructures()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Salary structures</h1>
        <p class="ui-muted">Reusable pay templates: earnings, deductions and how they're calculated.</p>
      </div>
      <div class="ui-actions">
        <RouterLink to="/payroll/structures/new" class="btn btn-primary">+ New structure</RouterLink>
      </div>
    </div>

    <div class="ui-toolbar">
      <input v-model="search" class="ui-input ui-search" type="search" placeholder="Search structures…" />
      <label v-if="inactiveCount" class="ui-check">
        <input v-model="showInactive" type="checkbox" /> Show inactive ({{ inactiveCount }})
      </label>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>Couldn't load salary structures</strong>
      <p>{{ error }}</p>
      <button class="btn btn-ghost btn-sm retry" @click="load">Try again</button>
    </div>

    <div v-else-if="!shown.length" class="ui-card ui-empty">
      <strong>{{ structures.length ? 'No matching structures' : 'No salary structures yet' }}</strong>
      <p v-if="!structures.length">Create one for each pay pattern, e.g. “Store staff”, “Riders”, “Managers”.</p>
      <RouterLink v-if="!structures.length" to="/payroll/structures/new" class="btn btn-primary btn-sm retry">
        + New structure
      </RouterLink>
    </div>

    <div v-else class="grid">
      <article
        v-for="s in shown"
        :key="s.id"
        class="ui-card card"
        tabindex="0"
        role="link"
        @click="router.push(`/payroll/structures/${s.id}`)"
        @keydown.enter="router.push(`/payroll/structures/${s.id}`)"
      >
        <div class="card-head">
          <h2>{{ s.name }}</h2>
          <span class="ui-pill" :class="s.isActive ? 'success' : 'muted'">{{ s.isActive ? 'Active' : 'Inactive' }}</span>
        </div>
        <p class="desc">{{ s.description || 'No description' }}</p>

        <div class="chips">
          <span v-for="c in s.components" :key="c.id || c.code" class="code" :class="c.type">{{ c.code }}</span>
        </div>

        <dl class="nums">
          <div>
            <dt>Earnings</dt>
            <dd>{{ formatINR(s.preview.earnings) }}</dd>
          </div>
          <div>
            <dt>Deductions</dt>
            <dd>{{ formatINR(s.preview.deductions) }}</dd>
          </div>
          <div>
            <dt>Net / month</dt>
            <dd class="net">{{ formatINR(s.preview.net) }}</dd>
          </div>
        </dl>

        <p class="foot">
          <template v-if="s.usesGross">Shown at {{ formatINR(SAMPLE_GROSS) }} gross · </template>
          {{ s.components.length }} component{{ s.components.length === 1 ? '' : 's' }} ·
          prorated by {{ labelOf(PRORATION_BASES, s.prorationBasis).toLowerCase() }} · created
          {{ formatDate(s.createdAt?.slice(0, 10)) }}
        </p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.retry {
  margin-top: 14px;
  display: inline-flex;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  cursor: pointer;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}

.card:hover,
.card:focus-visible {
  border-color: var(--accent-border);
  outline: none;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card-head h2 {
  font-size: 17px;
}

.desc {
  font-size: 13px;
  color: var(--muted);
  margin: -6px 0 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  color: var(--success);
  background: var(--success-bg);
}

.code.deduction {
  color: var(--danger);
  background: var(--danger-bg);
}

.nums {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-soft);
}

.nums dt {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.nums dd {
  margin: 2px 0 0;
  color: var(--text-h);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}

.nums .net {
  color: var(--accent);
}

.foot {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}
</style>
