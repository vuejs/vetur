<template>
  <basic-class @></basic-class>
</template>

<script>
import Vue from 'vue'
import BasicClass from './Child.vue'
import { Options } from 'vue-class-component'

@Options({
  components: {
    BasicClass
  }
})
export default class ParentClass extends Vue {
}
</script>
