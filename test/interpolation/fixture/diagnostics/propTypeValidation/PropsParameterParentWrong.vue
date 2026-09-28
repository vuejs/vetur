<template>
  <div>
    <props-parameter-child :title="count" :enabled="count" :items="numberItems" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import PropsParameterChild from './PropsParameterChild.vue';

export default Vue.extend({
  components: {
    PropsParameterChild
  },
  data() {
    return {
      count: 0
    };
  },
  computed: {
    numberItems(): number[] {
      return [0, 1];
    }
  }
});
</script>
