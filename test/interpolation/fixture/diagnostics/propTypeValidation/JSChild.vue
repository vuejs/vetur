<template>
  <div></div>
</template>

<script>
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
