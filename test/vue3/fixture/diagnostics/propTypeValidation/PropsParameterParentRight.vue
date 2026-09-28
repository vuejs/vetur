<template>
  <props-parameter-child :title="label" :enabled="enabled" :items="labels" />
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import PropsParameterChild from './PropsParameterChild.vue';

export default defineComponent({
  components: {
    PropsParameterChild
  },
  setup() {
    const label = ref('count');
    const enabled = ref(true);
    const labels = computed(() => [label.value]);

    return {
      label,
      enabled,
      labels
    };
  }
});
</script>
