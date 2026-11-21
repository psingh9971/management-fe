<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocPreview from '../../components/app/docs/DocPreview.vue'
import OfferLetterDocument from '../../components/app/offer/OfferLetterDocument.vue'
import FormField from '../../components/app/FormField.vue'
import {
  OFFER_STATUSES,
  confirmOfferLetter,
  forDocument,
  getOfferLetter,
  withdrawOfferLetter,
} from '../../services/offerLetterService'
import { getEmployee } from '../../services/employeeService'
import { downloadPdf, printDocument } from '../../utils/pdf'
import { formatINR } from '../../utils/format'
import { formatDate, todayISO } from '../../utils/date'
import { toast } from '../../stores/toast'

const route = useRoute()
const id = route.params.id

const letter = ref(null)
const employee = ref(null)
const loading = ref(true)
const error = ref('')
const downloading = ref(false)
const previewRef = ref(null)

const doc = computed(() => letter.value && forDocument(letter.value, employee.value))
const statusMeta = (s) => OFFER_STATUSES.find((x) => x.value === s) || { label: s, tone: 'muted' }
const fileName = (l) => `Offer Letter - ${l.candidateName} - ${(l.refNo || l.id).replaceAll('/', '-')}.pdf`
const fmt = (iso) => (iso ? formatDate(iso.slice(0, 10)) : '—')

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

// ---------- confirm / withdraw ----------
const modal = ref('') // '' | 'confirm' | 'withdraw'
const busy = ref(false)
const formError = ref('')
const confirmForm = reactive({ joiningDate: '', updateEmployee: true })
const withdrawReason = ref('')

function openModal(kind) {
  formError.value = ''
  if (kind === 'confirm') {
    confirmForm.joiningDate = letter.value.tentativeJoiningDate || todayISO()
    confirmForm.updateEmployee = true
  } else {
    withdrawReason.value = ''
  }
  modal.value = kind
}

async function submitConfirm() {
  if (!confirmForm.joiningDate) {
    formError.value = 'Pick the joining date'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    letter.value = await confirmOfferLetter(id, {
      joiningDate: confirmForm.joiningDate,
      updateEmployeeJoiningDate: confirmForm.updateEmployee,
    })
    modal.value = ''
    toast(`Offer confirmed — joining on ${formatDate(confirmForm.joiningDate)}`)
  } catch (e) {
    formError.value = e.message
  } finally {
    busy.value = false
  }
}

async function submitWithdraw() {
  if (withdrawReason.value.trim().length < 3) {
    formError.value = 'Give a reason of at least 3 characters'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    letter.value = await withdrawOfferLetter(id, withdrawReason.value)
    modal.value = ''
    toast('Offer letter withdrawn')
  } catch (e) {
    formError.value = e.message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  try {
    letter.value = await getOfferLetter(id)
  } catch (e) {
    error.value = e.status === 404 || e.status === 422 ? 'not-found' : e.message
  }
  if (letter.value) {
    // Contact details for the "To" block; the letter still renders without them.
    employee.value = await getEmployee(letter.value.employeeId).catch(() => null)
  }
  loading.value = false
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
            {{ [letter.refNo, letter.designation, `${formatINR(letter.monthlyGross)}/month`].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <div class="ui-actions">
          <template v-if="letter.status === 'provisional'">
            <RouterLink :to="`/employees/offer-letters/${id}/edit`" class="btn btn-ghost">Edit</RouterLink>
            <button class="btn btn-ghost" @click="openModal('confirm')">Confirm joining</button>
          </template>
          <button class="btn btn-ghost" @click="printDocument">Print</button>
          <button class="btn btn-primary" :disabled="downloading" @click="download">
            {{ downloading ? 'Preparing PDF…' : 'Download PDF' }}
          </button>
        </div>
      </div>

      <div class="layout">
        <div class="doc-wrap">
          <DocPreview ref="previewRef"><OfferLetterDocument :letter="doc" /></DocPreview>
        </div>

        <aside class="side">
          <div class="ui-card">
            <div class="ui-card-head"><h2>Status</h2></div>
            <p v-if="letter.status === 'provisional'" class="ui-muted status-text">
              Issued. The joining date is shown as tentative until you confirm it.
            </p>
            <p v-else-if="letter.status === 'confirmed'" class="ui-muted status-text">
              Confirmed{{ letter.confirmedAt ? ` on ${fmt(letter.confirmedAt)}` : '' }} — joining
              {{ fmt(letter.confirmedJoiningDate) }}.
            </p>
            <p v-else class="ui-muted status-text">
              Withdrawn{{ letter.withdrawnAt ? ` on ${fmt(letter.withdrawnAt)}` : '' }}.
              <template v-if="letter.withdrawalReason"><br />Reason: {{ letter.withdrawalReason }}</template>
            </p>
            <div v-if="letter.status === 'provisional'" class="status-actions">
              <button class="btn btn-primary btn-sm" @click="openModal('confirm')">Confirm joining date</button>
              <button class="btn btn-danger btn-sm" @click="openModal('withdraw')">Withdraw offer</button>
            </div>
          </div>

          <div class="ui-card">
            <div class="ui-card-head"><h2>Details</h2></div>
            <dl class="mini-dl">
              <div><dt>Offer date</dt><dd>{{ fmt(letter.offerDate) }}</dd></div>
              <div>
                <dt>{{ letter.joiningTentative ? 'Tentative joining' : 'Joining date' }}</dt>
                <dd>{{ fmt(letter.joiningDate) }}</dd>
              </div>
              <div><dt>Accept by</dt><dd>{{ fmt(letter.acceptBy) }}</dd></div>
              <div><dt>Location</dt><dd>{{ letter.location || '—' }}</dd></div>
              <div><dt>Salary structure</dt><dd>{{ letter.structureName || '—' }}</dd></div>
              <div><dt>Annual gross</dt><dd>{{ formatINR(letter.annualGross) }}</dd></div>
              <div><dt>Net / month</dt><dd>{{ formatINR(letter.monthlyNet) }}</dd></div>
              <div>
                <dt>Employee</dt>
                <dd>
                  <RouterLink :to="`/employees/${letter.employeeId}`">{{ letter.employeeCode || 'View profile' }}</RouterLink>
                </dd>
              </div>
            </dl>
          </div>
          <p v-if="!employee" class="ui-hint">Couldn't load the employee's contact details, so the address block is empty.</p>
        </aside>
      </div>

      <div v-if="modal" class="ui-modal-backdrop" @click.self="!busy && (modal = '')">
        <form v-if="modal === 'confirm'" class="ui-modal" novalidate @submit.prevent="submitConfirm">
          <h2>Confirm joining date</h2>
          <p class="ui-muted">The letter will show this as the final joining date instead of a tentative one.</p>
          <FormField v-model="confirmForm.joiningDate" label="Joining date" type="date" required />
          <label class="ui-check top-gap">
            <input v-model="confirmForm.updateEmployee" type="checkbox" />
            <span>
              Also set this as the employee's date of joining
              <small>Payroll uses it to prorate the first month's salary.</small>
            </span>
          </label>
          <p v-if="formError" class="ui-form-error top-gap">{{ formError }}</p>
          <div class="ui-modal-actions">
            <button type="button" class="btn btn-ghost" :disabled="busy" @click="modal = ''">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? 'Confirming…' : 'Confirm' }}</button>
          </div>
        </form>

        <form v-else class="ui-modal" novalidate @submit.prevent="submitWithdraw">
          <h2>Withdraw offer</h2>
          <p class="ui-muted">The letter stays on record, marked as withdrawn. This can't be undone.</p>
          <FormField
            v-model="withdrawReason"
            label="Reason"
            type="textarea"
            required
            placeholder="e.g. Candidate declined the offer"
          />
          <p v-if="formError" class="ui-form-error top-gap">{{ formError }}</p>
          <div class="ui-modal-actions">
            <button type="button" class="btn btn-ghost" :disabled="busy" @click="modal = ''">Cancel</button>
            <button type="submit" class="btn btn-danger" :disabled="busy">
              {{ busy ? 'Withdrawing…' : 'Withdraw offer' }}
            </button>
          </div>
        </form>
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

.status-text {
  margin: 0;
  font-size: 14px;
}

.status-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.top-gap {
  margin-top: 14px;
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

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .doc-wrap {
    padding: 8px;
  }
}
</style>
