<template>
  <div>
    <p :class="{
      foo: foo,
      bar: bar,
      baz
    }">Hello</p>

    <p :class="{ 'string': true, 1234567890: true }">Literal Keys</p>
  </div>
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
