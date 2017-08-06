# IntelliSense

Vetur offers IntelliSense all over your .vue file.

## `<template>`

Vetur offers IntelliSense for html tags & attributes.

IntelliSense for Element UI and Onsen UI components are also available. See [Framework Support](framework.md).

## `<style>`

Vetur offers IntelliSense for CSS properties & values in `css/scss/less/postcss/stylus`.  

## `<script>`

Vetur supports IntelliSense for `js/ts`.  
The IntelliSense should be almost the same to the IntelliSense in `js/ts` files.

#### Module Resolution

Vetur should be able to resolve external modules and provide IntelliSense for them if they have type definitions.

For example, `vue` packages type definition in its module, so

- `npm i -S vue`
- `import Vue from 'vue'`
- `Vue.` should prompt IntelliSense for Vue.

`lodash` doesn't package type definition with it, but there is `@types/lodash` that has type definition for `lodash`, so

- `npm i -S lodash`
- `npm i -D @types/lodash`
- `import * as _ from 'lodash'`
- `_.` should prompt IntelliSense for lodash.