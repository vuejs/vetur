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
  /**
   * My foo
   */
  @Emit('foo')
  foo() {}

  /**
   * My fooBar
   */
  @Emit()
  fooBar() {}

  /**
   * My foo2
   */
  @Emit('foo')
  foo2() {}
}
</script>
