<template>
  <div>
    <ol v-for="i in 5">
      <li>item</li>
    </ol>
  </div>
  <div></div>
</template>

<script>
import * as _ from 'lodash'
import Item from './Basic.Item.vue'

export default {
  components: { Item },
  data () {
    return {
      msg: 'Vetur means "Winter" in icelandic.'
    }
  },
  computed: {
    count () {
      return this.$store.state.count
    }
  },
  methods: {
    hello () {
      console.log(this.msg)
    }
  }
}
</script>

<style lang="scss" scoped>
.counter-wrapper > * {
  margin-bottom: 50px;
}
.counter {
  margin-left: auto;
  margin-right: auto;
  border-radius: 3px;
  width: 200px;
  height: 200px;
  text-align: center;
  line-height: 200px;
  font-size: 5rem;
  background-color: #f0f0f0;
  user-select: none;
}
</style>
