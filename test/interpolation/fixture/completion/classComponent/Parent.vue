<template>
  <div>
    <basic-class :></basic-class>
    <basic-class v-if="" @click="" :foo=""></basic-class>
    <BasicClass  />
    <
  </div>
</template>

<script>
import Vue from 'vue'
import BasicClass from './Child.vue'
import Component from 'vue-class-component'

@Component({
  components: {
    BasicClass
  },
  props: {
    /**
     * My foo
     */
    foo: {
      type: Boolean,
      default: false
    },
  }
})
export default class ParentClass extends Vue {
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
