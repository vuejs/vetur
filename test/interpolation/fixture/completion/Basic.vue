<template>
  <div>
    {{  }}
    {{ obj. }}
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
      msg: 'Vetur means "Winter" in icelandic.',

      /**
       * My obj
       */
      obj: {
        msg: 'Object message.'
      }
    }
  },
  computed: {
    /**
     * My count
     * @return {number}
     */
    count () {
      return this.$store.state.count
    }
  },
  methods: {
    /**
     * My greeting
     * @return {void}
     */
    hello () {
      console.log(this.msg)
    }
  }
};
</script>
