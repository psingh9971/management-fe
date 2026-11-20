<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import FormField from './FormField.vue'
import { WEEKDAYS, createPolicy, dayLabel, describeRule, listPolicies, updatePolicy } from '../../services/weekOffService'
import { toast } from '../../stores/toast'

const policies = ref([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    policies.value = await listPolicies()
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

// ---------- Create / edit modal ----------
const WEEKS = [1, 2, 3, 4, 5]
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th']

const modal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const nameError = ref('')
const form = reactive({ name: '', description: '', isDefault: false })
// Per weekday: { on, weeks: [] }  (empty weeks = every week)
const days = reactive(Object.fromEntries(WEEKDAYS.map((d) => [d, { on: false, weeks: [] }])))

const rules = computed(() =>
  WEEKDAYS.filter((d) => days[d].on).map((d) => ({ weekday: d, weeksOfMonth: [...days[d].weeks] })),
)

function open(policy = null) {
  editing.value = policy
  Object.assign(form, {
    name: policy?.name || '',
    description: policy?.description || '',
    isDefault: policy?.isDefault || false,
  })
  for (const d of WEEKDAYS) {
    const r = policy?.rules.find((x) => x.weekday === d)
    days[d].on = !!r
    days[d].weeks = r ? [...r.weeksOfMonth] : []
  }
  if (!policy) days.sunday.on = true // sensible starting point
  formError.value = ''
  nameError.value = ''
  modal.value = true
}

function toggleWeek(d, n) {
  const w = days[d].weeks
  const i = w.indexOf(n)
  if (i > -1) w.splice(i, 1)
  else w.push(n)
  if (w.length === WEEKS.length) w.splice(0) // all five = every week
}

async function save() {
  formError.value = ''
  nameError.value = form.name.trim() ? '' : 'Name is required'
  if (nameError.value) return
  if (!rules.value.length) {
    formError.value = 'Pick at least one week-off day.'
    return
  }
  saving.value = true
  try {
    const payload = { ...form, rules: rules.value }
    const p = editing.value ? await updatePolicy(editing.value.id, payload) : await createPolicy(payload)
    toast(editing.value ? `${p.name} updated` : `${p.name} created`)
    modal.value = false
    load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="ui-toolbar">
      <p class="ui-muted">Week-off policies decide which days employees get off. Assign a policy from an employee's profile.</p>
      <span class="spacer" />
      <button class="btn btn-primary btn-sm" @click="open()">+ New policy</button>
    </div>

    <div v-if="loadError" class="ui-card ui-empty">
      <strong>Couldn't load week-off policies</strong>
      <p>{{ loadError }}</p>
      <button class="btn btn-ghost btn-sm gap" @click="load">Try again</button>
    </div>

    <div v-else-if="loading && !policies.length" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="!policies.length" class="ui-card ui-empty">
      <strong>No week-off policies yet</strong>
      <p>For example: "Every Sunday", or "Every Sunday + 2nd &amp; 4th Saturday".</p>
      <button class="btn btn-primary btn-sm gap" @click="open()">+ New policy</button>
    </div>

    <div v-else class="grid" :class="{ dim: loading }">
      <article v-for="p in policies" :key="p.id" class="ui-card policy">
        <div class="policy-head">
          <h3>{{ p.name }}</h3>
          <span v-if="p.isDefault" class="ui-pill info">Default</span>
        </div>
        <p v-if="p.description" class="ui-muted">{{ p.description }}</p>
        <ul class="rules">
          <li v-for="r in p.rules" :key="r.weekday">{{ describeRule(r) }}</li>
        </ul>
        <button class="btn btn-ghost btn-sm edit" @click="open(p)">Edit</button>
      </article>
    </div>

    <div v-if="modal" class="ui-modal-backdrop" @click.self="modal = false">
      <form class="ui-modal wide" novalidate @submit.prevent="save">
        <h2>{{ editing ? `Edit ${editing.name}` : 'New week-off policy' }}</h2>
        <p v-if="formError" class="ui-form-error" role="alert">{{ formError }}</p>

        <div class="ui-form-grid two">
          <FormField v-model="form.name" label="Policy name" required maxlength="100" placeholder="Sunday + alternate Saturdays" :error="nameError" />
          <FormField v-model="form.description" label="Description" placeholder="Optional" />
        </div>

        <label class="ui-check default">
          <input v-model="form.isDefault" type="checkbox" />
          <span>Default policy<small>Used for employees who don't have a policy assigned</small></span>
        </label>

        <h3 class="days-title">Week-off days</h3>
        <div class="days">
          <div v-for="d in WEEKDAYS" :key="d" class="day" :class="{ on: days[d].on }">
            <label class="ui-check">
              <input v-model="days[d].on" type="checkbox" />
              {{ dayLabel(d) }}
            </label>
            <div v-if="days[d].on" class="weeks">
              <button type="button" class="ui-chip" :class="{ on: !days[d].weeks.length }" @click="days[d].weeks.splice(0)">
                Every week
              </button>
              <button
                v-for="n in WEEKS"
                :key="n"
                type="button"
                class="ui-chip"
                :class="{ on: days[d].weeks.includes(n) }"
                @click="toggleWeek(d, n)"
              >
                {{ ORD[n] }}
              </button>
            </div>
          </div>
        </div>

        <p class="summary">
          <strong>Summary:</strong>
          {{ rules.length ? rules.map(describeRule).join(', ') : 'No days selected' }}
        </p>

        <div class="ui-modal-actions">
          <button type="button" class="btn btn-ghost" @click="modal = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create policy' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.spacer {
  flex: 1;
}

.gap {
  margin-top: 14px;
}

.dim {
  opacity: 0.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.grid .ui-card + .ui-card {
  margin-top: 0;
}

.policy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.policy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.policy h3 {
  font-size: 17px;
}

.rules {
  margin: 0;
  padding-left: 18px;
  color: var(--text-h);
  font-size: 14px;
  flex: 1;
}

.edit {
  align-self: flex-start;
}

.ui-modal.wide {
  width: 640px;
}

.default {
  margin: 16px 0 6px;
}

.days-title {
  font-size: 15px;
  margin: 16px 0 10px;
}

.days {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
}

.day.on {
  border-color: var(--accent-border);
}

.day .ui-check {
  min-width: 120px;
  font-weight: 600;
}

.weeks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.summary {
  margin-top: 14px;
  font-size: 14px;
}

.summary strong {
  color: var(--text-h);
}

.ui-form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 600px) {
  .ui-form-grid.two {
    grid-template-columns: 1fr;
  }
}
</style>
