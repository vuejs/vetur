<template>
  <div></div>
</template>

<script>
import * as _ from 'lodash'

_.add(1, '5');
import Item from './Void.vue'

export default {
  components: { Ite },
  data () {
    return {
      ms: 'Vetur means "Winter" in icelandic.'
    }
  },
  compute: {
    count () {
      return this.$store.state.count
    }
  },
  methods: {
    hello () {
      console.lo(this.msg
    }
  }
}
</script>

<style lang="scss" scoped>
.counter-wrapper > * {
  margin-bottom: 
}
</style>
