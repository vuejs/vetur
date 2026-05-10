<template>
  <props-type-child :required-text="count" :optional-count="'wrong'" />
</template>

<script lang="ts">
import Vue from 'vue';
import PropsTypeChild from './PropsTypeChild.vue';

export default Vue.extend({
  components: {
    PropsTypeChild
  },
  data() {
    return {
      count: 0
    };
  }
});
</script>
