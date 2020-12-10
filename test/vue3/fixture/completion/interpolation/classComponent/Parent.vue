<template>
  <basic-class @></basic-class>
</template>

<script>
import Vue from 'vue'
import BasicClass from './Child.vue'
import Component from 'vue-class-component'

@Component({
  components: {
    BasicClass
  }
})
export default class ParentClass extends Vue {
}
</script>
