<template>
  <div :title="message | capitalize | foo(test)">
    <p>{{ price | comma }}</p>
    <p>{{ messaage | capitalize | foo(...test) }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      price: 1000,
      message: 'hello'
    }
  }
})
</script>

