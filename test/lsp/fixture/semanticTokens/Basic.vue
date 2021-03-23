<template>
  <div></div>
</template>

<script lang="ts">
import Vue from 'vue'

const aConst = 'SOME_STORE';

export default Vue.extend({
  methods: {
    abc() {
      this.log(aConst)
    },
    log(str: string) {
      console.log(str);
    }
  }
})
</script>