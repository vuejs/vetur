<template>
  <div>
    <typed-child camel-case="ready" />
    <typed-class-child />
    <generic-child />
  </div>
</template>
<script lang="ts">
import Vue from 'vue';
import TypedChild from './TypedChild.vue';
import TypedClassChild from './TypedClassChild.vue';
import GenericChild from './GenericChild';
export default Vue.extend({ components: { TypedChild, TypedClassChild, GenericChild } });
</script>
