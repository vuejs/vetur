<template>
  <div>
    <!-- Providing no errors -->
    <button @click="eventTest($event)">Event Test</button>
    <button @click="argumentsTest(arguments)">Arguments Test</button>
    <button @click="eventTest">Reference Test</button>
    <button @click="test = 123">Expression Test</button>
    <button @click="() => test = 123">Block Statement Test</button>
    <button v-on="{ click: eventTest }">Object Style Test</button>
    <button @click.stop>Empty Value Test</button>

    <!-- Providing errors -->
    <button @click="passString(123)">Invalid Argument Type</button>
    <button @click="test = 'test'">Invalid Update Type</button>
    <button @click="notExist">Invalid Reference Test</button>
    <button v-on="{ click: notExist }">Invalid Object Style Test</button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      test: 0
    }
  },

  methods: {
    // Interface from lib "dom"
    eventTest(event: MouseEvent): void {},
    // Interface from lib "es5"
    argumentsTest(args: IArguments): void {},
    passString(str: string): void {}
  }
})
</script>
