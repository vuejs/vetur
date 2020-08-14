<template>
  <div>
    {{  }}
    {{ obj. }}
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

/**
 * My basic tag
 */
@Component({
  props: {
    /**
     * My foo
     */
    foo: {
      type: Boolean,
      default: false
    }
  }
})
export default class BasicClass extends Vue {
  /**
   * My msg
   */
  msg = 'Vetur means "Winter" in icelandic.'

  /**
   * My obj
   */
  obj = {
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
}
</script>
