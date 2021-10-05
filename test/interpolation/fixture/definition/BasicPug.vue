<template lang="pug">
  div
    child(foo="bar")
    test-bar
    TestBar
</template>

<script>
import * as _ from 'lodash'
import Child from './Child.vue'
import TestBar from './TestBar.vue'

export default {
  components: {
    Child,
    TestBar
  }
}
</script>
