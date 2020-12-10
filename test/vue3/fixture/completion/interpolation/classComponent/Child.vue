<template>
  <div></div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

/**
 * My basic tag
 */
@Component({
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
