# Interpolation Support

Vue template allows JavaScript-esque expression in four constructs:

- [Directives](https://vuejs.org/v2/guide/syntax.html#Directives) like `v-if="exp"`
- [Attributes](https://vuejs.org/v2/guide/syntax.html#Attributes) like `:id="exp"`
- [Event Handlers](https://vuejs.org/v2/guide/events.html#Method-Event-Handlers) like `@click="exp"`
- [Template Interpolations](https://vuejs.org/v2/guide/syntax.html#Text) like
```vue
<div>{{ exp }}</div>
```

Other than the [filter syntax](https://vuejs.org/v2/guide/filters.html), the expression is 100% JavaScript expression.

Vetur now offers completion, diagnostics, hover, jump to definition, find references for these JavaScript snippets.

## Generic Language Features

::: warning
These features are experimental and you need to set `vetur.experimental.templateInterpolationService: true` to enable them. You can also only disable template diagnostics with `vetur.validation.template: false`, although that disables the built-in ESLint checking, too.
:::

Currently diagnostics, hover, jump to definition and find references are implemented in this way:

- Compile original Vue template into a virtual TypeSript file
- Generate a sourcemap between expressions in original `.vue` file and the virtual file
- Run language feature requests on the virtual TypeScript file
- Map results back to original `.vue` file

:::tip
Use the command "Vetur: Show corresponding virtual file and sourcemap" to understand how the
templates are represented in Vetur. Useful for bug filing too.
:::

If you do find bugs, please [fill an issue](https://github.com/vuejs/vetur/issues).

If you want more details as to how this feature is implemented, I wrote a blog post: [Generic Vue Template Interpolation Language Features
](https://blog.matsu.io/generic-vue-template-interpolation-language-features).

## Completion

Completion now works a little bit differently than the other language features. Mainly because completion works off a
Syntactically incomplete file and the generic compiler from Vue template to virtual TypeScript file cannot handle that yet.

Completion:

- Collects information from `<script>` region by traversing its AST
- Offer `props`, `data` and `methods` in interpolation regions
- Offer `:prop` completion on child components

## Type Checking with JSDocs

You don't have to use `lang="ts"` for typing functions. This would show error that `'foo'` is not assignable to `number`

```vue
<template>
  <div>{{ numOnly(post.body) }}</div>
</template>

<script>
/**
 * @typedef {object} Post
 * @property {string} body
 */

export default {
  props: {
    post: {
      /**
       * @type {import('vue').PropType<Post>}
       */
      type: Object,
      required: true
    }
  },

  methods: {
    /**
     * @param {number} num
     */
    numOnly(num) {

    }
  }
}
</script>
```
