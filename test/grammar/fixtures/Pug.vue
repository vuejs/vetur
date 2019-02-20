<template lang="pug">
  .pug
    .normal-pug(attribute="test") Text
    .normal-pug-multi(attribute="test")
      .test Text
      | Test 2
    .vue-directive(v-if="test")
    .vue-directive-2(:attr="test()")
    .vue-interpolation {{test.case()}}
    .single-quote(v-if='test')
</template>


