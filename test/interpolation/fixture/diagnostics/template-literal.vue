<template>
  <div :title="`${test}`" />
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      test: 'hi'
    }
  }
})
</script>