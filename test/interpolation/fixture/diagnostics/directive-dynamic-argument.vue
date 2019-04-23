<template>
  <div
    :[propName]="value"
    :[notExist]="value"
    @[notExist]="listener"
    v-test:[notExist]
  ></div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      propName: 'title',
      value: 'Test'
    }
  },

  methods: {
    listener(): void {}
  }
})
</script>
