<template>
  <div>
    <typed-child camel-case="ready" />
    <typed-class-child />
    <generic-child />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import TypedChild from './TypedChild.vue';
import TypedClassChild from './TypedClassChild.vue';
import GenericChild from './GenericChild';
export default defineComponent({ components: { TypedChild, TypedClassChild, GenericChild } });
</script>
