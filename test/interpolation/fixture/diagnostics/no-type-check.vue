<template>
  <div>
    <div>{{ accessNonexistentProperty }}</div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      msg: 'foo'
    }
  },
  computed: {
    accessNonexistentProperty() {
      return this.message
    }
  }
}
</script>
