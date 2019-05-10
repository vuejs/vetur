<template>
  <div>
    <!-- Pre Vue 2.5 API -->
    <template slot="default" slot-scope="b">
      {{ a.foo }}
    </template>
  </div>
</template>


<script lang="ts">
import Vue from 'vue'

export default Vue.extend({ })
</script>
