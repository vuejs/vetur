<template>
  <js-child :str="`count: ${state.count}`" :bool="state.isZeroCount" :callback="increment" :arr="[1, 2]" />
  <ts-child :str="`count: ${state.count}`" :bool="state.isZeroCount" :callback="increment" :arr="['a', 'b']" />
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from "vue";
import JSChild from "./JSChild.vue";
import TSChild from "./TSChild.vue";

export default defineComponent({
  components: {
    JSChild,
    TSChild
  },
  setup() {
    const state: { count: number, isZeroCount: boolean } = reactive({
      count: 0,
      isZeroCount: computed(() => state.count === 0)
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
