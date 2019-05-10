<template>
  <div>
    <div v-if="!node">
      {{ assert(node) }}
    </div>
    <div v-else-if="node.type === 'element'">
      {{ assert(node) }}
    </div>
    <div v-else-if="node.type === 'attribute'">
      {{ assert(node) }}
    </div>
    <div v-else>
      {{ assert(node) }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

type Node = Element | Attribute | Text

interface Element {
  type: 'element'
}

interface Attribute {
  type: 'attribute'
}

interface Text {
  type: 'text'
}

export default Vue.extend({
  data() {
    return {
      node: null as Node | null
    }
  },

  methods: {
    assert(node: never): void {}
  }
})
</script>
