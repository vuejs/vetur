<template>
  <p>{{ messaage }}</p>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: {},

  data() {
    return {
      message: 'Hello'
    };
  }
});
</script>
