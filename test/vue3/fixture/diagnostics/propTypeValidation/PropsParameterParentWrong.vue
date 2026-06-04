<template>
  <props-parameter-child :title="count" :enabled="count" :items="numberItems" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import PropsParameterChild from './PropsParameterChild.vue';

export default defineComponent({
  components: {
    PropsParameterChild
  },
  setup() {
    const count = ref(0);
    const numberItems = ref([0, 1]);

    return {
      count,
      numberItems
    };
  }
});
</script>
