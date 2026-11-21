<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listOfferLetters, OFFER_STATUSES } from '../../services/offerLetterService'
import { formatINR, initials } from '../../utils/format'
import { formatDate } from '../../utils/date'

const router = useRouter()
const letters = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const status = ref('')

const statusMeta = (s) => OFFER_STATUSES.find((x) => x.value === s) || { label: s, tone: 'muted' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    letters.value = await listOfferLetters({ status: status.value })
  } catch (e) {
    error.value = e.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

watch(status, load)

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return letters.value
  return letters.value.filter((l) =>
    [l.candidateName, l.employeeCode, l.designation, l.refNo, l.location].some((v) => String(v || '').toLowerCase().includes(q)),
  )
})

onMounted(load)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Offer letters</h1>
        <p class="ui-muted">Issue branded JP Enterprises × Zepto offer letters, confirm joining dates and download them as PDF.</p>
      </div>
      <div class="ui-actions">
        <RouterLink to="/employees/offer-letters/new" class="btn btn-primary">+ New offer letter</RouterLink>
      </div>
    </div>

    <div class="ui-toolbar">
      <input v-model="search" class="ui-input ui-search" type="search" placeholder="Search by name, code, role or letter no…" />
      <div class="ui-tabs no-margin" role="tablist" aria-label="Status">
        <button :class="{ active: status === '' }" @click="status = ''">All</button>
        <button v-for="s in OFFER_STATUSES" :key="s.value" :class="{ active: status === s.value }" @click="status = s.value">
          {{ s.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>Couldn't load offer letters</strong>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!shown.length" class="ui-card ui-empty">
      <strong>{{ search || status ? 'No matching offer letters' : 'No offer letters yet' }}</strong>
      <p v-if="!search && !status">Add the candidate as an employee and assign their salary, then issue the letter.</p>
      <RouterLink v-if="!search && !status" to="/employees/offer-letters/new" class="btn btn-primary btn-sm empty-cta">
        + New offer letter
      </RouterLink>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Ref no</th>
            <th>Offer date</th>
            <th>Joining</th>
            <th class="num">Gross / month</th>
            <th>Status</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="l in shown"
            :key="l.id"
            class="clickable"
            @click="router.push(`/employees/offer-letters/${l.id}`)"
          >
            <td>
              <div class="ui-person">
                <span class="ui-avatar">{{ initials(l.candidateName) }}</span>
                <span>
                  <strong>{{ l.candidateName }}</strong>
                  <small>{{ [l.employeeCode, l.designation, l.location].filter(Boolean).join(' · ') }}</small>
                </span>
              </div>
            </td>
            <td class="mono">{{ l.refNo }}</td>
            <td>{{ l.offerDate ? formatDate(l.offerDate) : '—' }}</td>
            <td>
              {{ l.joiningDate ? formatDate(l.joiningDate) : '—' }}
              <small v-if="l.joiningDate && l.joiningTentative" class="ui-muted"> tentative</small>
            </td>
            <td class="num">{{ formatINR(l.monthlyGross) }}</td>
            <td>
              <span class="ui-pill" :class="statusMeta(l.status).tone">{{ statusMeta(l.status).label }}</span>
            </td>
            <td class="num" @click.stop>
              <div class="row-actions">
                <RouterLink :to="`/employees/offer-letters/${l.id}?download=1`" class="btn btn-ghost btn-sm">
                  Download
                </RouterLink>
                <RouterLink
                  v-if="l.status === 'provisional'"
                  :to="`/employees/offer-letters/${l.id}/edit`"
                  class="btn btn-ghost btn-sm"
                >
                  Edit
                </RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!loading && shown.length" class="ui-muted foot">
      {{ shown.length }} letter{{ shown.length === 1 ? '' : 's' }} shown
    </p>
  </div>
</template>

<style scoped>
.no-margin {
  margin-bottom: 0;
}

.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
}

.row-actions {
  display: inline-flex;
  gap: 6px;
}

.empty-cta {
  margin-top: 14px;
  display: inline-flex;
}

.foot {
  margin-top: 10px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
