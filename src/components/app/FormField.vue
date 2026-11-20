<script setup>
const model = defineModel({ type: [String, Number], default: '' })

defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  options: { type: Array, default: () => [] },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: Boolean,
  disabled: Boolean,
  upper: Boolean,
  span: { type: String, default: '' }, // '' | 'span-2' | 'full'
  inputmode: { type: String, default: undefined },
  maxlength: { type: [Number, String], default: undefined },
  max: { type: String, default: undefined },
})

defineEmits(['blur'])
</script>

<template>
  <label class="ui-field" :class="[span, { invalid: !!error }]">
    <span class="ui-label">{{ label }}<em v-if="required">*</em></span>

    <select v-if="type === 'select'" v-model="model" class="ui-input" :disabled="disabled" @blur="$emit('blur')">
      <option value="" disabled>Select…</option>
      <option v-for="o in options" :key="o.value ?? o" :value="o.value ?? o">{{ o.label ?? o }}</option>
    </select>

    <textarea
      v-else-if="type === 'textarea'"
      v-model="model"
      class="ui-input"
      rows="2"
      :placeholder="placeholder"
      :disabled="disabled"
      @blur="$emit('blur')"
    />

    <input
      v-else
      v-model="model"
      class="ui-input"
      :class="{ upper }"
      :type="type"
      :placeholder="placeholder"
      :inputmode="inputmode"
      :maxlength="maxlength"
      :max="max"
      :disabled="disabled"
      autocomplete="off"
      @blur="$emit('blur')"
    />

    <small v-if="error" class="ui-error">{{ error }}</small>
    <small v-else-if="hint" class="ui-hint">{{ hint }}</small>
  </label>
</template>
