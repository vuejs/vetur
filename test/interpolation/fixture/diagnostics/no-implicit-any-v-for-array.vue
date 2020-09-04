<template>
  <div>
    <div
      v-for="num in list"
      :key="num.q"
    >
      Test {{num.q.toString()}}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  computed: {
    list () {
      const result = []
      for (let i = 1; i < 10; i++) {
        if (i % 2 === 0)
        result.push({ c: i, q: i })
      }
      return result
    }
  }
})
</script>
