<template>
  <div>
    <typed-child :payload="{ id: 1, label: 'ok' }" camel-case="ready" />
    <typed-class-child :payload="{ id: 1, label: 'ok' }" />
    <generic-child :payload="{ id: 1, label: 'ok' }" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import TypedChild from './TypedChild.vue';
import TypedClassChild from './TypedClassChild.vue';
import GenericChild from './GenericChild';
export default defineComponent({ components: { TypedChild, TypedClassChild, GenericChild } });
</script>
