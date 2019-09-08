<template>
  <div v-if="
    !loading1
      && !loading2
      && !loading3
  ">
    {{ test+true }}
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      test: 123,
      loading1: true,
      loading2: false
    }
  }
})
</script>
