<template>
  <div>
    <js-child :str="`count: ${count}`" :bool="isZeroCount" :callback="increment" :arr="['a', 'b']" />
    <ts-child :str="`count: ${count}`" :bool="isZeroCount" :callback="increment" :arr="zeroToCountAsStrings" />
    <ts-child :str="`count: ${count}`" :bool.sync="isZeroCount" :callback="increment" :arr="zeroToCountAsStrings" />
    <array-props-child :foo="42" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import JSChild from './JSChild.vue';
import TSChild from './TSChild.vue';
import ArrayPropsChild from './ArrayPropsChild.vue';

export default Vue.extend({
  components: {
    JSChild,
    TSChild,
    ArrayPropsChild
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
    },
    zeroToCountAsStrings(): string[] {
      return this.zeroToCount.map(n => n.toString())
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
});
</script>