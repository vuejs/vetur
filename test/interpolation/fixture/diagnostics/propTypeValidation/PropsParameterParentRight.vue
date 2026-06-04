<template>
  <div>
    <props-parameter-child :title="label" :enabled="isZeroCount" :items="labels" />
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
      label: 'count'
    };
  },
  computed: {
    isZeroCount(): boolean {
      return false;
    },
    labels(): string[] {
      return [this.label];
    }
  }
});
</script>
