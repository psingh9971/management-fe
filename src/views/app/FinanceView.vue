<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import FormField from '../../components/app/FormField.vue'
import { addTransaction, deleteTransaction, getSummary, listTransactions } from '../../services/financeService'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../services/constants'
import { formatINR } from '../../utils/format'
import { currentMonth, formatDate, formatMonth, todayISO } from '../../utils/date'
import { validateField } from '../../utils/validators'
import { toast } from '../../stores/toast'

const month = ref(currentMonth())
const typeFilter = ref('')
const summary = ref({ income: 0, expense: 0, net: 0 })
const transactions = ref([])
const loading = ref(true)

const shown = computed(() => transactions.value.filter((t) => !typeFilter.value || t.type === typeFilter.value))

async function load() {
  loading.value = true
  const [s, t] = await Promise.all([getSummary(month.value), listTransactions(month.value)])
  summary.value = s
  transactions.value = t
  loading.value = false
}

watch(month, (m) => m && load())

async function remove(t) {
  if (!confirm(`Delete this ${t.type} of ${formatINR(t.amount)}?`)) return
  await deleteTransaction(t.id)
  toast('Transaction deleted')
  load()
}

// ---------- Add transaction modal ----------
const modalOpen = ref(false)
const saving = ref(false)
const tx = reactive({ type: 'expense', category: '', amount: '', date: todayISO(), note: '' })
const errors = reactive({})
const categories = computed(() => (tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES))

watch(
  () => tx.type,
  () => (tx.category = ''),
)

function openModal() {
  Object.assign(tx, { type: 'expense', category: '', amount: '', date: todayISO(), note: '' })
  Object.keys(errors).forEach((k) => delete errors[k])
  modalOpen.value = true
}

async function submit() {
  errors.category = validateField(tx.category, ['required'])
  errors.amount = validateField(tx.amount, ['required', 'positive'])
  errors.date = validateField(tx.date, ['required'])
  if (errors.category || errors.amount || errors.date) return
  saving.value = true
  await addTransaction({ ...tx, note: tx.note.trim() })
  saving.value = false
  modalOpen.value = false
  toast(`${tx.type === 'income' ? 'Income' : 'Expense'} of ${formatINR(tx.amount)} added`)
  if (tx.date.startsWith(month.value)) load()
  else month.value = tx.date.slice(0, 7)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Finance</h1>
        <p class="ui-muted">Income and expenses for {{ formatMonth(month) }}.</p>
      </div>
      <div class="ui-actions">
        <input v-model="month" type="month" class="ui-input month" :max="currentMonth()" aria-label="Month" />
        <button class="btn btn-primary" @click="openModal">+ Add transaction</button>
      </div>
    </div>

    <div class="ui-tiles">
      <div class="ui-tile">
        <span class="ui-tile-label">Income</span>
        <span class="ui-tile-value">{{ formatINR(summary.income) }}</span>
        <span class="ui-tile-sub">Payouts &amp; incentives</span>
      </div>
      <div class="ui-tile">
        <span class="ui-tile-label">Expenses</span>
        <span class="ui-tile-value">{{ formatINR(summary.expense) }}</span>
        <span class="ui-tile-sub">Rent, salaries, bills…</span>
      </div>
      <div class="ui-tile">
        <span class="ui-tile-label">Net</span>
        <span class="ui-tile-value">{{ formatINR(summary.net) }}</span>
        <span class="ui-tile-sub">
          <span class="ui-pill" :class="summary.net >= 0 ? 'success' : 'danger'">
            {{ summary.net >= 0 ? 'Profit' : 'Loss' }}
          </span>
        </span>
      </div>
    </div>

    <div class="ui-toolbar">
      <div class="ui-tabs no-margin" role="tablist" aria-label="Transaction type">
        <button :class="{ active: typeFilter === '' }" @click="typeFilter = ''">All</button>
        <button :class="{ active: typeFilter === 'income' }" @click="typeFilter = 'income'">Income</button>
        <button :class="{ active: typeFilter === 'expense' }" @click="typeFilter = 'expense'">Expenses</button>
      </div>
    </div>

    <div v-if="loading" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="!shown.length" class="ui-card ui-empty">
      <strong>No transactions in {{ formatMonth(month) }}</strong>
      <p>Add income or expenses to see them here.</p>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Note</th>
            <th class="num">Amount</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in shown" :key="t.id">
            <td>{{ formatDate(t.date) }}</td>
            <td>
              <span class="ui-pill" :class="t.type === 'income' ? 'success' : 'danger'">
                {{ t.type === 'income' ? 'Income' : 'Expense' }}
              </span>
            </td>
            <td>{{ t.category }}</td>
            <td class="note">{{ t.note || '—' }}</td>
            <td class="num amount">{{ t.type === 'income' ? '+' : '−' }} {{ formatINR(t.amount) }}</td>
            <td class="num">
              <button class="btn btn-danger btn-sm" @click="remove(t)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modalOpen" class="ui-modal-backdrop" @click.self="modalOpen = false">
      <form class="ui-modal" novalidate @submit.prevent="submit">
        <h2>Add transaction</h2>
        <div class="ui-tabs" role="radiogroup" aria-label="Type">
          <button type="button" :class="{ active: tx.type === 'expense' }" @click="tx.type = 'expense'">Expense</button>
          <button type="button" :class="{ active: tx.type === 'income' }" @click="tx.type = 'income'">Income</button>
        </div>
        <div class="ui-form-grid two">
          <FormField v-model="tx.category" label="Category" type="select" :options="categories" required :error="errors.category" />
          <FormField v-model="tx.amount" label="Amount (₹)" type="number" inputmode="numeric" required :error="errors.amount" />
          <FormField v-model="tx.date" label="Date" type="date" :max="todayISO()" required :error="errors.date" />
          <FormField v-model="tx.note" label="Note" placeholder="Optional" />
        </div>
        <div class="ui-modal-actions">
          <button type="button" class="btn btn-ghost" @click="modalOpen = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Add' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.month {
  width: 170px;
}

.no-margin {
  margin-bottom: 0;
}

.note {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  color: var(--text-h);
  font-weight: 600;
}

.ui-form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 600px) {
  .ui-form-grid.two {
    grid-template-columns: 1fr;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
