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
  </div>
</template>

<script>
import ChildComp from './child.vue'

export default {
  components: {
    ChildComp
  },
  props: ['foo', 'bar']
}
</script>