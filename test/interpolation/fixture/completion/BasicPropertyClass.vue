<template>
  <div>
    {{  }}
  </div>
</template>

<script>
import Vue from 'vue'
import { Prop, Component } from 'vue-property-decorator'

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
   * My msg
   */
  msg = 'Vetur means "Winter" in icelandic.'

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
}
</script>
