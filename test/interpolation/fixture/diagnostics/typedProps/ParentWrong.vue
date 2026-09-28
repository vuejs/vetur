<template>
  <div>
    <typed-child :payload="{ id: 'wrong', label: 'ok' }" :camel-case="42" />
    <typed-class-child :payload="{ id: 'wrong', label: 'ok' }" />
    <generic-child :payload="{ id: 'wrong', label: 'ok' }" />
  </div>
</template>
<script lang="ts">
import Vue from 'vue';
import TypedChild from './TypedChild.vue';
import TypedClassChild from './TypedClassChild.vue';
import GenericChild from './GenericChild';
export default Vue.extend({ components: { TypedChild, TypedClassChild, GenericChild } });
</script>
