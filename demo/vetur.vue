<template>
  <div class="test">
    <ul><li>Hello vetur</li></ul>
  </div>
</template>

<style>
div .test {
  list-style: none;
}
</style>

<script>
export default {
  methods: {
    hey () {
      console.log('Hello vetur')
    }
  }
}
</script>

<script lang="ts">
const hey: string = "Hello vetur";
</script>

<style lang="sass">
div.test
  ul
    list-style: none
</style>

<style lang="scss">
div.test {
  ul {
    list-style: none;
  }
}
</style>

<style lang="less">
div.test {
  ul {
    list-style: none;
  }
}
</style>

<style lang="stylus">
div.test
  ul
    list-style: none
</style>

<template lang="jade">
// h1(name=maintainer.name)
//   | Maintainer:
//   = ' ' + maintainer.name
table
  tr
    td(style='width: '+(100/2)+'%').
      Twitter
    td= maintainer.twitter
  tr
    td(style='width: '+(100/2)+'%').
      Blog
    td= maintainer.blog

- var user = { name: 'John' }
if user
  div.welcomebox
    // Filtered inline output
    p.
      Welcome, #{user.name}
else
  div.loginbox
    form(name="login", action="/login", method="post")
      input(type="text", name="user")
      input(type="password", name="pass")
      input(type="submit", value="login")

p #[code samp] — Regular text. #[samp This is sample text] more text.
</template>