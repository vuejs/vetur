<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      message: 'Hello'
    }
  }
})
</script>

<template>
  <p>{{ message + foo }}</p>
</template>

