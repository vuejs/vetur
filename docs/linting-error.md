# Linting / Error Checking

Vetur provides error-checking and linting.

## Error Checking

Vetur has error checking for the following languages:

- `<template>`: `html`
- `<style>`: `css`, `scss`, `less`
- `<script>`: `js`, `ts`

You can selectively turn error checking off by `vetur.validation.[template/style/script]`.

## Linting

Vetur bundles [`eslint-plugin-vue`](https://eslint.vuejs.org) for template error checking. By default, Vetur loads the [`vue/essential`](https://eslint.vuejs.org/rules/#priority-a-essential-error-prevention-for-vue-js-2-x) ruleset for Vue 2 projects and [`vue3-essential`](https://eslint.vuejs.org/rules/#priority-a-essential-error-prevention-for-vue-js-3-x) ruleset for Vue 3 projects.

If you want to config ESLint rules, do the following:

- Turn off Vetur's template validation with `vetur.validation.template: false`
- Make sure you have the [ESLint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint). The errors will come from ESLint plugin, not Vetur.
- `yarn add -D eslint eslint-plugin-vue` in your workspace root
- Set ESLint rules in `.eslintrc`. For example:
  ```json
  {
    "extends": [
      "eslint:recommended",
      "plugin:vue/recommended"
    ],
    "rules": {
      "vue/html-self-closing": "off"
    }
  }
  ```

You can also checkout [Veturpack](https://github.com/octref/veturpack) to see how to setup `eslint-plugin-vue`.

#### Linting TypeScript

TSLint is not available yet. We do look forward to including it. See [#170](https://github.com/vuejs/vetur/issues/170).

Meanwhile, TS compiler errors will be shown.
