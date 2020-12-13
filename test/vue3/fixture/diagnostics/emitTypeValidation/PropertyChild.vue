<template>
  <div></div>
</template>

<script>
import Vue from 'vue'
import { Emit, Component } from 'vue-property-decorator'

/**
 * My basic tag
 */
@Component()
export default class BasicPropertyClass extends Vue {
  @Emit('foo')
  foo() {
    return true
  }

  @Emit('foo')
  foo2() {
    return 0
  }

  @Emit('bar')
  bar() {}

  @Emit('bar')
  bar2() {
    return 0
  }
}
</script>
