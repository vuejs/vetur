<template>
  <p :class="{
    foo: foo,
    bar: bar
  }">Hello</p>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: {},

  data() {
    return {
      foo: true
    }
  }
})
</script>
