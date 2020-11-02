<template>
  <p>{{ a?.b ?? '1' }}</p>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data () {
    return {
      a: {
        b: ''
      } as { b: string } | null
    }
  }
})
</script>
