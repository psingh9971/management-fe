<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import FormField from './FormField.vue'
import { createLeaveType, listLeaveTypes, updateLeaveType } from '../../services/leaveService'
import { toast } from '../../stores/toast'

const types = ref([])
const loading = ref(true)
const loadError = ref('')
const showInactive = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    types.value = await listLeaveTypes({ includeInactive: showInactive.value })
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

watch(showInactive, load)

// ---------- Create / edit modal ----------
const modal = ref(false)
const editing = ref(null) // leave type being edited, or null for new
const saving = ref(false)
const formError = ref('')
const form = reactive({ name: '', code: '', description: '', annualQuota: 0, isPaid: true, isActive: true })
const errors = reactive({ name: '', code: '', annualQuota: '' })

function open(type = null) {
  editing.value = type
  Object.assign(
    form,
    type
      ? { ...type }
      : { name: '', code: '', description: '', annualQuota: 0, isPaid: true, isActive: true },
  )
  Object.assign(errors, { name: '', code: '', annualQuota: '' })
  formError.value = ''
  modal.value = true
}

function validate() {
  errors.name = form.name.trim() ? '' : 'Name is required'
  const code = String(form.code).trim()
  errors.code = editing.value
    ? ''
    : !code
      ? 'Code is required'
      : !/^[A-Za-z0-9_]{1,20}$/.test(code)
        ? 'Letters, numbers and _ only (max 20)'
        : ''
  const q = Number(form.annualQuota)
  errors.annualQuota = form.annualQuota === '' || Number.isNaN(q) || q < 0 ? 'Enter 0 or more days' : ''
  return !errors.name && !errors.code && !errors.annualQuota
}

async function save() {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const t = editing.value ? await updateLeaveType(editing.value.id, form) : await createLeaveType(form)
    toast(editing.value ? `${t.name} updated` : `${t.name} created`)
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
      <label class="ui-check">
        <input v-model="showInactive" type="checkbox" />
        Show inactive leave types
      </label>
      <span class="spacer" />
      <button class="btn btn-primary btn-sm" @click="open()">+ New leave type</button>
    </div>

    <div v-if="loadError" class="ui-card ui-empty">
      <strong>Couldn't load leave types</strong>
      <p>{{ loadError }}</p>
      <button class="btn btn-ghost btn-sm gap" @click="load">Try again</button>
    </div>

    <div v-else-if="loading && !types.length" class="ui-card ui-empty">Loading…</div>

    <div v-else-if="!types.length" class="ui-card ui-empty">
      <strong>No leave types yet</strong>
      <p>Create types like Casual Leave (CL), Sick Leave (SL) or Earned Leave (EL).</p>
      <button class="btn btn-primary btn-sm gap" @click="open()">+ New leave type</button>
    </div>

    <div v-else class="ui-table-wrap" :class="{ dim: loading }">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Leave type</th>
            <th>Code</th>
            <th class="num">Days / year</th>
            <th>Pay</th>
            <th>Status</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in types" :key="t.id">
            <td>
              <strong class="name">{{ t.name }}</strong>
              <small v-if="t.description" class="desc">{{ t.description }}</small>
            </td>
            <td><code>{{ t.code }}</code></td>
            <td class="num">{{ t.annualQuota }}</td>
            <td>
              <span class="ui-pill" :class="t.isPaid ? 'success' : 'warning'">{{ t.isPaid ? 'Paid' : 'Unpaid' }}</span>
            </td>
            <td>
              <span class="ui-pill" :class="t.isActive ? 'success' : 'muted'">{{ t.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
            <td class="num">
              <button class="btn btn-ghost btn-sm" @click="open(t)">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="ui-modal-backdrop" @click.self="modal = false">
      <form class="ui-modal" novalidate @submit.prevent="save">
        <h2>{{ editing ? `Edit ${editing.name}` : 'New leave type' }}</h2>
        <p v-if="formError" class="ui-form-error" role="alert">{{ formError }}</p>

        <div class="ui-form-grid two">
          <FormField v-model="form.name" label="Name" required maxlength="100" placeholder="Casual Leave" :error="errors.name" />
          <FormField
            v-model="form.code"
            label="Code"
            required
            upper
            maxlength="20"
            placeholder="CL"
            :disabled="!!editing"
            :hint="editing ? 'Code can’t be changed' : 'Short code, e.g. CL, SL, EL'"
            :error="errors.code"
          />
          <FormField
            v-model="form.annualQuota"
            label="Days per year"
            type="number"
            inputmode="decimal"
            required
            hint="Use 0 for no fixed quota"
            :error="errors.annualQuota"
          />
          <div class="checks">
            <label class="ui-check">
              <input v-model="form.isPaid" type="checkbox" />
              <span>Paid leave<small>Salary is not deducted</small></span>
            </label>
            <label class="ui-check">
              <input v-model="form.isActive" type="checkbox" />
              <span>Active<small>Employees can apply for it</small></span>
            </label>
          </div>
          <FormField v-model="form.description" label="Description" type="textarea" span="full" placeholder="Optional" />
        </div>

        <div class="ui-modal-actions">
          <button type="button" class="btn btn-ghost" @click="modal = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create' }}
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

.name {
  display: block;
  color: var(--text-h);
}

.desc {
  display: block;
  max-width: 360px;
  color: var(--muted);
  font-size: 12px;
  white-space: normal;
}

code {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-soft);
  color: var(--text-h);
}

.checks {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
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
