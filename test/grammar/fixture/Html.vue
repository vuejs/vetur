<template>
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
    <div class="string concat" :attr="i + will + 'concat' + this + string"></div>
    <div class="v-slot" v-slot:foo="bar"></div>
    <div class="v-slot shorthand" #foo="bar"></div>
    <router-link :to="{path: `/my/path#hash=${hash}`}">click me</router-link>
    <h4><icon v-if=foo bar :hover=bar /></h4>
  </div>
</template>
