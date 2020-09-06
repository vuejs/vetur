<template>
  <div>
    <array-child></array-child>
    <array-child foo="foo"></array-child>
    <array-child :foo="foo"></array-child>
    <array-child :foo="foo" :bar="bar" v-bind:baz="bar"></array-child>
    <array-child :foo="foo" :bar="bar" :bAz="bar"></array-child>
    <array-child :foo="foo" :bar="bar" :b-az="bar"></array-child>
    <array-child :foo="foo" :bar="bar" :baz="bar"></array-child>
    <ArrayChild />
    <ArrayChild></ArrayChild>
    <simple-validator-child />
    <object-validator-child />
    <object-validator-child :foo="foo" />
    <object-validator-child bar="bar" />
    <class-child />
    <class-child ear="ear" />
    <class-child ear="ear" :checked="true" />
    <class-child :ear.sync="foo" :checked="true" />
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
