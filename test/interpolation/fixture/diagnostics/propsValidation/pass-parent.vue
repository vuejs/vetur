<template>
  <div>
    <array-child :foo="foo" :bar="bar" :bAz="bar"></array-child>
    <array-child :foo="foo" :bar="bar" :b-az="bar"></array-child>
    <object-validator-child v-model="foo" :bar="bar" />
    <class-child v-bind="{}" />
    <class-child v-bind:[bar]="{}" />
    <class-child :[bar]="{}" />
    <class-child v-model="foo" :foo="foo" :bar="1" ear="ear" far="far" name="name" />
  </div>
</template>


<script>
import ArrayChild from './array-props-child.vue'
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
