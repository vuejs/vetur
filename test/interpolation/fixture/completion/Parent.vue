<template>
  <div>
    <basic :></basic>
    <basic v-if="" @click="" :foo=""></basic>
    <
  </div>
</template>

<script>
import Basic from './Basic.vue'

export default {
  components: {
    Basic
  },
  props: {
    /**
     * My foo
     */
    foo: {
      type: Boolean,
      default: false
    },
  },
  data () {
    return {
      /**
       * My msg
       */
      msg: 'Vetur means "Winter" in icelandic.'
    }
  },
  computed: {
    /**
     * My count
     */
    count () {
      return 42;
    }
  },
  methods: {
    /**
     * My greeting
     */
    hello () {
      console.log(this.msg)
    }
  }
}
</script>

