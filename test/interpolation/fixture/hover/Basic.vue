<template>
  <div>
    <p>{{ msg }}</p>

    <ul>
      <li v-for="(item, i) in list" :key="i">
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data () {
    return {
      msg: 'Vetur means "Winter" in icelandic.',
      list: [0, 1, 2]
    }
  }
}
</script>
