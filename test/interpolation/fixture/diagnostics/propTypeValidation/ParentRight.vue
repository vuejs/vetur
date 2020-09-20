<template>
  <div>
    <js-child :str="`count: ${count}`" :bool="isZeroCount" :callback="increment" />
    <ts-child :str="`count: ${count}`" :bool="isZeroCount" :callback="increment" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import JSChild from "./JSChild.vue";
import TSChild from "./TSChild.vue";

export default Vue.extend({
  components: {
    JSChild,
    TSChild
  },
  data() {
    return {
      count: 0
    }
  },
  computed: {
    isZeroCount(): boolean {
      return this.count === 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
});
</script>