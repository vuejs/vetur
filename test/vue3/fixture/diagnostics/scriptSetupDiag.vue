<template>
  <div />
</template>

<script lang="ts" setup>
import { computed } from 'vue'
const props = defineProps<{
  isActive: boolean
}>()

const active = computed(() => props.isActive)

const cc = computed(() => {
  const a: boolean[] = []
  function b () {
  }

  return active.value
})

const c: string = active.value
</script>
