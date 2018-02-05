<template>
  <div>
    <!-- Providing no errors -->
    <button @click="eventTest($event)">Event Test</button>
    <button @click="argumentsTest(arguments)">Arguments Test</button>
    <button @click="eventTest">Reference Test</button>
    <button @click="test = 123">Expression Test</button>

    <!-- Providing errors -->
    <button @click="passString">Invalid Argument Type (reference)</button>
    <button @click="passString(123)">Invalid Argument Type</button>
    <button @click="test = 'test'">Invalid Update Type</button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: {},

  data() {
    return {
      test: 0
    }
  },

  methods: {
    eventTest(event: Event): void {},
    argumentsTest(args: IArguments): void {},
    passString(str: string): void {}
  }
})
</script>
