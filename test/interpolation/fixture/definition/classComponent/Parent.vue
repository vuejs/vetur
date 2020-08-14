<template>
  <div>
    <child></child>
    <child />
  </div>
</template>

<script>
import Vue from 'vue'
import Child from './Child.vue'
import Component from 'vue-class-component'

@Component({
  components: {
    Child
  },
})
export default class ParentClass extends Vue {}
</script>
