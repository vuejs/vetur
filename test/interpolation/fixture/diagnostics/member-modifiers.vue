<template>
  <div>
    <!-- direct properties -->
    <p>{{ a }}</p>
    <p>{{ b }}</p>
    <p>{{ c }}</p>

    <!-- child properties -->
    <p>{{ child.a }}</p>
    <p>{{ child.b }}</p>
    <p>{{ child.c }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

class Child {
  public a = 'this is public'
  protected b = 'this is protected'
  private c = 'this is private'
}

@Component
export default class MemberModifiers extends Vue {
  public a = 'this is public'
  protected b = 'this is protected'
  private c = 'this is private'

  child = new Child()
}
</script>
