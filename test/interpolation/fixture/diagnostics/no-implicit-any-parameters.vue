<template>
  <div @click="(event) => onClick(event)">
    <div @click="(event) => onClick(event)">
      <div :allow="(event) => onClick(event)" />
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    onClick (e) {
      console.log(e)
    }
  }
}
</script>
