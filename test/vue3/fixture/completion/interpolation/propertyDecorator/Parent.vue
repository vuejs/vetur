<template>
  <basic-property-class @></basic-property-class>
</template>

<script>
import Vue from 'vue'
import BasicPropertyClass from './Child.vue'
import { Component } from 'vue-property-decorator'

@Component({
  components: {
    BasicPropertyClass
  }
})
export default class ParentClass extends Vue {
}
</script>
