<template>
  <div>
    <p v-for="(item, i) in list" :key="i">{{ item + i }}</p>
    <p v-for="(value, key, i) in obj" :key="key">
      <span>{{ value + key + i }}</span>
      <span>{{ notExists }}</span>
    </p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
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
