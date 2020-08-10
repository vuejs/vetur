<template>
  <div>
    <child></child>
    <child foo="foo"></child>
    <child :foo="foo"></child>
    <child :foo="foo" :bar="bar" v-bind:baz="bar"></child>
    <child :foo="foo" :bar="bar" :bAz="bar"></child>
    <child :foo="foo" :bar="bar" :b-az="bar"></child>
    <child :foo="foo" :bar="bar" :baz="bar"></child>
  </div>
</template>

<script>
import child from './child.vue'

export default {
  components: {
    child
  },
  props: ['foo', 'bar']
}
</script>