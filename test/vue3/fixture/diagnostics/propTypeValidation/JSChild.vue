<template>
  <div></div>
</template>

<script>
import { PropType, defineComponent, ref, reactive } from "vue";

export default {
  props: {
    str: String,
    bool: Boolean,
    callback: {
      type: Function
    },
    arr: Array
  }
};
</script>
