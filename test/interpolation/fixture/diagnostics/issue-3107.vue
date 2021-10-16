<template>
  <button @click="page = newPage">
    Switch to page {{ newPage }}
  </button>
</template>

<script>
export default {
  data() {
    return {
      page: "home",
      newPage: "products",
    }
  }
}
</script>
