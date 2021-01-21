<template>
  <js-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
  <ts-child @null="onNull" @non="onNon" @one="onOne" @two="onTwo" @rest="onRest" />
  <property-child @foo="onFoo" @bar="onBar" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
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
    const onNull = (_a: any) => {}
    const onNon = () => {}
    const onOne = (_a: string) => {}
    const onTwo = (_a: boolean, _b: string[]) => {}
    const onRest = (_a: string, ..._args: number[]) => {}
    const onFoo = (_a: number | boolean) => {}
    const onBar = (_a?: number) => {}

    return {
      onNull,
      onNon,
      onOne,
      onTwo,
      onRest,
      onFoo,
      onBar
    };
  }
});
</script>
