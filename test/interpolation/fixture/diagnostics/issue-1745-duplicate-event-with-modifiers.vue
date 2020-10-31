<template>
  <input
   @keydown.down.up.prevent.stop="a"
   @keydown.esc.prevent="b"
  />
</template>

<script>
export default {
  methods: {
    a() {},
    b() {}
  }
}
</script>