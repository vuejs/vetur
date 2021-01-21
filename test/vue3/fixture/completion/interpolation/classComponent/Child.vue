<template>
  <div></div>
</template>

<script>
import Vue from 'vue'
import { Options } from 'vue-class-component'

/**
 * My basic tag
 */
@Options({
  emits: {
    /**
     * My foo
     */
    foo: () => true
  }
})
export default class BasicClass extends Vue {
}
</script>
