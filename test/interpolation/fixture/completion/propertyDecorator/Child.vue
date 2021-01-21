<template>
  <div>
    {{  }}
    {{ obj. }}
  </div>
</template>

<script>
import Vue from 'vue'
import { Prop, Component, Emit } from 'vue-property-decorator'

/**
 * My basic tag
 */
@Component()
export default class BasicPropertyClass extends Vue {
  /**
   * My foo
   */
  @Prop({ type: Boolean, default: false }) foo

  /**
   * My bar
   */
  @PropSync('bar', { type: String }) syncedBar

  /**
   * My checked
   */
  @Model('change', { type: Boolean }) checked

  /**
   * My msg
   */
  msg = 'Vetur means "Winter" in icelandic.'

  /**
   * My obj
   */
  obj = {
    /**
     * Obj message
     */
    msg: 'Object message.'
  }

  /**
   * My count
   */
  get count () {
    return this.$store.state.count
  }

  /**
   * My greeting
   */
  hello () {
    console.log(this.msg)
  }

  /**
   * My baz
   */
  @Emit('baz')
  baz() {}

  /**
   * My fooBar
   */
  @Emit()
  fooBar() {}

  /**
   * My baz2
   */
  @Emit('baz')
  baz2() {}
}
</script>
