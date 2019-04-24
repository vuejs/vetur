<template>
  <div attr-test :prop-test="value" @on-test="value = 'Test'"></div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      value: 'Hello'
    }
  }
})
</script>
