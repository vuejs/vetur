<template functional>
  <div class="html">
    <div class="normal-pug" attribute="test">Text</div>
    <div class="normal-pug-multi" attribute="test">
      <div class="test">Text</div>
      Test 2
    </div>
    <div class="vue-directive" v-if="test"></div>
    <div class="vue-directive-2" :attr="test()"></div>
    <div class="vue-interpolation">{{test.case()}}</div>
    <div class="single-quote" v-if='test'></div>
  </div>
</template>
