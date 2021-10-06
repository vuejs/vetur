<template>
  <ts-child v-model="state.isZeroCount" :value="state.count" :str="`count: ${state.count}`" :bool="state.isZeroCount" :callback="increment" :arr="['a', 'b']" />
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from "vue";
import TSChild from "./TSChild.vue";

export default defineComponent({
  components: {
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
