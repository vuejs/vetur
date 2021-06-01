<template>
  <div>
    <foo-tag foo-attr="v" />
    <foo-tag :foo-attr="'v'" />
    <foo-tag error="foo" @error="noop" />
  </div>
</template>

<script>
export default {
  methods: {
    noop() {},
  },
}
</script>
