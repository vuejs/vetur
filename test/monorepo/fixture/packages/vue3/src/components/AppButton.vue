<template>
  <button :disabled="disabled">{{ text }}</button>
</template>

<script lang="ts">
import { ref } from 'vue'

export default {
  props: {
    text: {
      type: String,
      required: true
    }
  },
  setup () {
    const disabled = ref(false)

    return {
      disabled
    }
  }
}
</script>
