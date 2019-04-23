<template>
  <p :class="{
    foo: foo,
    bar: bar,
    baz
  }">Hello</p>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      foo: true
    }
  }
})
</script>
