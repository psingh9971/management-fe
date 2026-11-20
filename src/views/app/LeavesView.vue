<script setup>
import { ref } from 'vue'
import LeaveTypesPanel from '../../components/app/LeaveTypesPanel.vue'
import WeekOffPoliciesPanel from '../../components/app/WeekOffPoliciesPanel.vue'

const tab = ref('types')
</script>

<template>
  <div>
    <div class="ui-page-head">
      <div>
        <h1>Leaves &amp; week offs</h1>
        <p class="ui-muted">Set up leave types and week-off policies for your employees.</p>
      </div>
    </div>

    <div class="ui-tabs" role="tablist">
      <button role="tab" :class="{ active: tab === 'types' }" :aria-selected="tab === 'types'" @click="tab = 'types'">
        Leave types
      </button>
      <button role="tab" :class="{ active: tab === 'weekoff' }" :aria-selected="tab === 'weekoff'" @click="tab = 'weekoff'">
        Week-off policies
      </button>
    </div>

    <LeaveTypesPanel v-if="tab === 'types'" />
    <WeekOffPoliciesPanel v-else />
  </div>
</template>
