<template>
  <js-child :str="state.count" :bool="state" :callback="state.isZeroCount" :arr="[1, 2]" />
  <ts-child :str="state.count" :bool="state" :callback="state.isZeroCount" :arr="state.zeroToCount" />
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from "vue";
import JSChild from "./JSChild.vue";
import TSChild from "./TSChild.vue";

export default defineComponent({
  components: {
    JSChild,
    TSChild
  },
  setup() {
    const state: { count: number, isZeroCount: boolean, zeroToCount: number[] } = reactive({
      count: 0,
      isZeroCount: computed(() => state.count === 0),
      zeroToCount: computed(() => [...Array(state.count).keys()])
    });

    function increment() {
      state.count++;
    }

    return {
      state,
      increment
    };
  }
});
</script>