<template>
  <div>
    <array-child :foo="foo" :bar="bar" :bAz="bar"></array-child>
    <array-child :foo="foo" :bar="bar" :b-az="bar"></array-child>
    <class-child v-bind="{}" />
    <class-child v-bind:[bar]="{}" />
    <class-child :[bar]="{}" />
  </div>
</template>


<script>
import ArrayChild from './array-props-child.vue'
import SimpleValidatorChild from './simple-validator-props-child.vue'
import ObjectValidatorChild from './object-validator-props-child.vue'
import ClassChild from './class-child.vue'

export default {
  components: {
    ArrayChild,
    SimpleValidatorChild,
    ObjectValidatorChild,
    ClassChild
  },
  props: ['foo', 'bar']
}
</script>
