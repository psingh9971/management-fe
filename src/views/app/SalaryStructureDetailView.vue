<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CALCULATION_TYPES,
  COMPONENT_TYPES,
  deleteStructure,
  describeComponent,
  getStructure,
  labelOf,
  needsGross,
  previewStructure,
  PRORATION_BASES,
  SAMPLE_GROSS,
} from '../../services/salaryStructureService'
import { formatINR } from '../../utils/format'
import { formatDate } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const s = ref(null)
const loading = ref(true)
const error = ref('')

const sampleGross = ref(SAMPLE_GROSS)
const usesGross = computed(() => !!s.value && needsGross(s.value.components))
const preview = computed(() => (s.value ? previewStructure(s.value.components, sampleGross.value) : null))

const deleting = ref(false)

async function remove() {
  if (!confirm(`Delete “${s.value.name}”? This can't be undone.`)) return
  deleting.value = true
  try {
    await deleteStructure(s.value.id)
    toast(`${s.value.name} deleted`)
    router.push('/payroll/structures')
  } catch (e) {
    // 422 when the structure has been assigned to someone — it can only be deactivated.
    toast(
      e.status === 422 ? `${e.message || "Can't delete a structure that's been assigned"}. Mark it inactive instead.` : e.message,
      'error',
    )
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  try {
    s.value = await getStructure(route.params.id)
  } catch (e) {
    error.value = e.status === 404 ? 'not-found' : e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <RouterLink to="/payroll/structures" class="back">← Salary structures</RouterLink>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>{{ error === 'not-found' ? 'Salary structure not found' : "Couldn't load this structure" }}</strong>
      <p v-if="error !== 'not-found'">{{ error }}</p>
    </div>

    <template v-else-if="s">
      <div class="ui-page-head">
        <div>
          <h1>{{ s.name }}</h1>
          <p class="ui-muted head-meta">
            <span class="ui-pill" :class="s.isActive ? 'success' : 'muted'">{{ s.isActive ? 'Active' : 'Inactive' }}</span>
            {{ s.description || 'No description' }}
          </p>
        </div>
        <div class="ui-actions">
          <label v-if="usesGross" class="gross">
            <span>Sample gross</span>
            <input v-model.number="sampleGross" class="ui-input" type="number" min="0" step="500" aria-label="Sample monthly gross" />
          </label>
          <RouterLink :to="`/payroll/structures/new?from=${s.id}`" class="btn btn-ghost">Duplicate</RouterLink>
          <button class="btn btn-ghost danger" :disabled="deleting" @click="remove">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
          <RouterLink :to="`/payroll/structures/${s.id}/edit`" class="btn btn-primary">Edit</RouterLink>
        </div>
      </div>

      <div class="ui-tiles">
        <div class="ui-tile">
          <span class="ui-tile-label">Earnings / month</span>
          <span class="ui-tile-value">{{ formatINR(preview.earnings) }}</span>
          <span class="ui-tile-sub">{{ s.components.filter((c) => c.type === 'earning').length }} components</span>
        </div>
        <div class="ui-tile">
          <span class="ui-tile-label">Deductions / month</span>
          <span class="ui-tile-value">{{ formatINR(preview.deductions) }}</span>
          <span class="ui-tile-sub">{{ s.components.filter((c) => c.type === 'deduction').length }} components</span>
        </div>
        <div class="ui-tile">
          <span class="ui-tile-label">Net pay / month</span>
          <span class="ui-tile-value">{{ formatINR(preview.net) }}</span>
          <span class="ui-tile-sub">{{ usesGross ? `At ₹${Number(sampleGross || 0).toLocaleString('en-IN')} gross` : 'Full month, before proration' }}</span>
        </div>
        <div class="ui-tile">
          <span class="ui-tile-label">Prorated by</span>
          <span class="ui-tile-value small">{{ labelOf(PRORATION_BASES, s.prorationBasis) }}</span>
          <span class="ui-tile-sub">Created {{ formatDate(s.createdAt?.slice(0, 10)) }}</span>
        </div>
      </div>

      <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Component</th>
              <th>Type</th>
              <th>Calculation</th>
              <th>Prorated</th>
              <th class="num">Monthly amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in preview.rows" :key="r.id || r.code">
              <td class="ui-muted">{{ i + 1 }}</td>
              <td class="mono">{{ r.code }}</td>
              <td class="name">{{ r.name }}</td>
              <td>
                <span class="ui-pill" :class="r.type === 'deduction' ? 'danger' : 'success'">
                  {{ labelOf(COMPONENT_TYPES, r.type) }}
                </span>
              </td>
              <td :title="labelOf(CALCULATION_TYPES, r.calcType)">{{ describeComponent(r) }}</td>
              <td>{{ r.isProrated ? 'Yes' : 'No' }}</td>
              <td class="num amount" :class="r.type">
                {{ r.type === 'deduction' ? '−' : '' }}{{ formatINR(r.amount) }}
                <small v-if="r.error" class="ui-error">{{ r.error }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="ui-hint note">
        Edits apply to future payroll runs; slips already generated keep their old amounts. Structures that have been
        assigned to an employee can't be deleted — edit them and untick “Active” instead.
      </p>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}

.back:hover {
  color: var(--text-h);
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.gross {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.gross .ui-input {
  width: 120px;
}

.ui-tile-value.small {
  font-size: 20px;
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  color: var(--text-h);
}

.name {
  color: var(--text-h);
  font-weight: 600;
}

.amount {
  color: var(--text-h);
  font-weight: 600;
}

.amount.deduction {
  color: var(--danger);
}

.amount small {
  display: block;
  font-weight: 400;
}

.danger {
  color: var(--danger);
}

.note {
  display: block;
  margin-top: 12px;
}
</style>
