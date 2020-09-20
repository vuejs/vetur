<template>
  <div>
    <js-child :str="count" :bool="count" :callback="count" :arr="[0, 1]" />
    <ts-child :str="count" :bool="count" :callback="count" :arr="zeroToCount" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import JSChild from './JSChild.vue';
import TSChild from './TSChild.vue';

export default Vue.extend({
  components: {
    JSChild,
    TSChild
  },
  data() {
    return {
      count: 0
    };
  },
  computed: {
    isZeroCount(): boolean {
      return this.count === 0;
    },
    zeroToCount(): number[] {
      return [...Array(this.count).keys()];
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
});
</script>