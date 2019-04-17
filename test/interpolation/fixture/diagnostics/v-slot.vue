<template>
  <slot-comp v-slot="{ a, b }">
    {{ a + b + c }}
  </slot-comp>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({

})
</script>
