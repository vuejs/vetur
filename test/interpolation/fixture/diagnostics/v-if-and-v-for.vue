<template>
  <div>
    <div v-for="d in data" v-if="d" :key="d">
      {{ assert(d) }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      data: [] as (string | null)[]
    }
  },

  methods: {
    assert(v: never): void {}
  }
})
</script>
