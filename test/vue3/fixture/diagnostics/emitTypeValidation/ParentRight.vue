<template>
  <js-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
  <ts-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
  <property-child @foo="onFoo" />
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from "vue";
import JSChild from "./JSChild.vue";
import TSChild from "./TSChild.vue";
import PropertyChild from "./PropertyChild.vue"

export default defineComponent({
  components: {
    JSChild,
    TSChild,
    PropertyChild
  },
  setup() {
    const onNull = (a: any) => {}
    const onNon = () => {}
    const onOne = (a: string) => {}
    const onTwo = (a: boolean, b: string[]) => {}
    const onRest = (a: string, ...args: number[]) => {}
    const onFoo = (a: number | boolean) => {}

    return {
      onNull,
      onNon,
      onOne,
      onTwo,
      onRest,
      onFoo
    };
  }
});
</script>
