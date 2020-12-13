<template>
  <js-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
  <ts-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
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
    const onNull = (a: never) => {}
    const onNon = (p: number) => {}
    const onOne = (a: boolean, b: string) => {}
    const onTwo = (a: boolean, b: string[], c: number) => {}
    const onRest = (...args: never[]) => {}

    return {
      onNull,
      onNon,
      onOne,
      onTwo,
      onRest
    };
  }
});
</script>
