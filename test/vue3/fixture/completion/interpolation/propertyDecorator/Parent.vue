<template>
  <basic-property-class @></basic-property-class>
  <basic-property-class-with-emits @></basic-property-class-with-emits>
</template>

<script>
import Vue from 'vue'
import BasicPropertyClass from './Child.vue'
import BasicPropertyClassWithEmits from './ChildWithEmitsOption.vue'
import { Component } from 'vue-property-decorator'

@Component({
  components: {
    BasicPropertyClass,
    BasicPropertyClassWithEmits
  }
})
export default class ParentClass extends Vue {
}
</script>
