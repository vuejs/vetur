<template>
  <div>
    <typed-child :payload="{ id: 'wrong', label: 'ok' }" :camel-case="42" />
    <typed-class-child :payload="{ id: 'wrong', label: 'ok' }" />
    <generic-child :payload="{ id: 'wrong', label: 'ok' }" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import TypedChild from './TypedChild.vue';
import TypedClassChild from './TypedClassChild.vue';
import GenericChild from './GenericChild';
export default defineComponent({ components: { TypedChild, TypedClassChild, GenericChild } });
</script>
