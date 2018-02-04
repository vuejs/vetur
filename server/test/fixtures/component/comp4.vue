<template>
  <div>
    <p v-for="(item, i) in list" :key="i">{{ item + i }}</p>
    <p v-for="(value, key, i) in obj" :key="key">{{ value + key + i }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: {},

  data() {
    return {
      list: ['foo', 'bar'],
      obj: {
        foo: 'foo',
        bar: 'bar'
      }
    };
  }
});
</script>
