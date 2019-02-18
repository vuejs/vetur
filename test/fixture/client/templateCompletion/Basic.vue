<template>
  <div>
    {{  }}
  </div>
</template>

<script>

/**
 * My basic tag
 */
export default {
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
      return this.$store.state.count
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
