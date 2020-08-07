<template>
  <div>
    <ChildComp ></ChildComp>
    <ChildComp :></ChildComp>
    <c
  </div>

</template>

<script>
import ChildComp from './Child.vue'

export default {
  components: {
    ChildComp
  }
}
</script>