<template>
  <div>
    <child-comp></child-comp>
    <child-comp foo="foo"></child-comp>
    <child-comp :foo="foo"></child-comp>
    <child-comp :foo="foo" :bar="bar" v-bind:baz="bar"></child-comp>
    <child-comp :foo="foo" :bar="bar" :bAz="bar"></child-comp>
    <child-comp :foo="foo" :bar="bar" :b-az="bar"></child-comp>
    <child-comp :foo="foo" :bar="bar" :baz="bar"></child-comp>
    <ChildComp />
    <ChildComp></ChildComp>
    <detailed-child />
    <detailed-child :foo="foo" />
    <detailed-child bar="bar" />
    <object-child />
    <class-child />
    <class-child ear="ear" />
    <class-child ear="ear" :checked="true" />
  </div>
</template>

<script>
import ChildComp from './array-props-child.vue'
import DetailedChild from './detailed-props-child.vue'
import ObjectChild from './object-props-child.vue'
import ClassChild from './class-child.vue'

export default {
  components: {
    ChildComp,
    DetailedChild,
    ObjectChild,
    ClassChild
  },
  props: ['foo', 'bar']
}
</script>
