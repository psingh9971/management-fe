<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocPreview from '../../components/app/docs/DocPreview.vue'
import OfferLetterDocument from '../../components/app/offer/OfferLetterDocument.vue'
import { deleteOfferLetter, getOfferLetter, OFFER_STATUSES, setOfferStatus } from '../../services/offerLetterService'
import { downloadPdf, printDocument } from '../../utils/pdf'
import { formatINR } from '../../utils/format'
import { formatDate } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const letter = ref(null)
const loading = ref(true)
const error = ref('')
const downloading = ref(false)
const previewRef = ref(null)

const statusMeta = (s) => OFFER_STATUSES.find((x) => x.value === s) || OFFER_STATUSES[0]
const fileName = (l) => `Offer Letter - ${l.candidateName} - ${l.refNo.replaceAll('/', '-')}.pdf`

async function download() {
  if (!letter.value || downloading.value) return
  downloading.value = true
  try {
    await nextTick()
    await downloadPdf(previewRef.value.root, fileName(letter.value))
    toast('PDF downloaded')
  } catch (e) {
    console.error(e)
    toast('Could not create the PDF — try Print → Save as PDF', 'error')
  } finally {
    downloading.value = false
  }
}

async function changeStatus(status) {
  letter.value = await setOfferStatus(id, status)
  toast(`Marked as ${statusMeta(status).label.toLowerCase()}`)
}

async function remove() {
  if (!confirm(`Delete offer letter ${letter.value.refNo}?`)) return
  await deleteOfferLetter(id)
  toast('Offer letter deleted')
  router.push('/employees/offer-letters')
}

onMounted(async () => {
  try {
    letter.value = await getOfferLetter(id)
  } catch (e) {
    error.value = e.status === 404 ? 'not-found' : e.message
  } finally {
    loading.value = false
  }
  if (letter.value && route.query.download) {
    // Drop ?download from the URL without a route change (the layout remounts views on any fullPath change).
    window.history.replaceState({ ...window.history.state, current: route.path }, '', route.path)
    // Let the logo images finish loading before capturing.
    setTimeout(download, 400)
  }
})
</script>

<template>
  <div>
    <RouterLink to="/employees/offer-letters" class="back">← Offer letters</RouterLink>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="error" class="ui-card ui-empty">
      <strong>{{ error === 'not-found' ? 'Offer letter not found' : "Couldn't load this offer letter" }}</strong>
      <p v-if="error !== 'not-found'">{{ error }}</p>
    </div>

    <template v-else-if="letter">
      <div class="ui-page-head">
        <div>
          <h1>{{ letter.candidateName }}</h1>
          <p class="ui-muted head-meta">
            <span class="ui-pill" :class="statusMeta(letter.status).tone">{{ statusMeta(letter.status).label }}</span>
            {{ letter.refNo }} · {{ letter.designation }} · {{ formatINR(letter.monthlyGross) }}/month · joins
            {{ formatDate(letter.joiningDate) }}
          </p>
        </div>
        <div class="ui-actions">
          <RouterLink :to="`/employees/offer-letters/${id}/edit`" class="btn btn-ghost">Edit</RouterLink>
          <button class="btn btn-ghost" @click="printDocument">Print</button>
          <button class="btn btn-primary" :disabled="downloading" @click="download">
            {{ downloading ? 'Preparing PDF…' : 'Download PDF' }}
          </button>
        </div>
      </div>

      <div class="layout">
        <div class="doc-wrap">
          <DocPreview ref="previewRef"><OfferLetterDocument :letter="letter" /></DocPreview>
        </div>

        <aside class="side">
          <div class="ui-card">
            <div class="ui-card-head"><h2>Status</h2></div>
            <div class="status-list">
              <button
                v-for="s in OFFER_STATUSES"
                :key="s.value"
                class="ui-chip"
                :class="{ on: letter.status === s.value }"
                :aria-pressed="letter.status === s.value"
                @click="letter.status !== s.value && changeStatus(s.value)"
              >
                {{ s.label }}
              </button>
            </div>
            <p class="ui-hint status-hint">Track whether the candidate has received and signed the letter.</p>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Details</h2></div>
            <dl class="mini-dl">
              <div><dt>Offer date</dt><dd>{{ formatDate(letter.offerDate) }}</dd></div>
              <div><dt>Accept by</dt><dd>{{ formatDate(letter.acceptBy) }}</dd></div>
              <div><dt>Location</dt><dd>{{ letter.location || '—' }}</dd></div>
              <div><dt>Annual gross</dt><dd>{{ formatINR(letter.monthlyGross * 12) }}</dd></div>
              <div v-if="letter.employeeId">
                <dt>Employee</dt>
                <dd><RouterLink :to="`/employees/${letter.employeeId}`">View profile</RouterLink></dd>
              </div>
            </dl>
          </div>

          <button class="btn btn-danger btn-sm delete" @click="remove">Delete offer letter</button>
        </aside>
      </div>
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

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: start;
}

.doc-wrap {
  padding: 20px;
  border-radius: 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  display: flex;
  justify-content: center;
}

.doc-wrap > * {
  max-width: 794px;
}

.side .ui-card + .ui-card {
  margin-top: 16px;
}

.status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-hint {
  display: block;
  margin-top: 10px;
}

.mini-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mini-dl dt {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.mini-dl dd {
  margin: 2px 0 0;
  color: var(--text-h);
}

.mini-dl a {
  color: var(--accent);
}

.delete {
  margin-top: 16px;
  width: 100%;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .doc-wrap {
    padding: 8px;
  }
}
</style>
