<template>
  <div>{{ bar }}</div>
</template>

<script>
export default {
  name: 'TestComp',
  props: {
    /**
     * My bar
     */
    bar: String
  },
  data () {
    return {
      count: 0
    }
  }
}
</script>
