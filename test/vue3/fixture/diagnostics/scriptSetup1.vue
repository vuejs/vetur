<template>
  <div />
</template>

<script lang="ts" setup>
import { computed } from 'vue'
const props = defineProps<{
  isActive: boolean
}>()

const active = computed(() => props.isActive)

function getStatus () {
  return active.value
}
</script>
