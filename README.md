# vetur

Vue tooling for VSCode.  

This extension is in development and not stable yet.  
You can [open an issue](https://github.com/octref/vetur/issues/new) for bugs or feature requests.

## Implemented Features

- IntelliSense for html/css/scss/less/js
- Syntax highlighting for:
  - html/jade/pug
  - css/sass/scss/less/stylus
  - js/ts
- emmet for `<template>`

## Demo

Try for yourself on this file: [demo/vetur.vue](https://github.com/octref/vetur/blob/master/demo/vetur.vue).

![demo](./asset/demo.png)

## Setup

- Install [vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)
- In your user settings, set

  ```json
  "files.associations": {
    "*.vue": "vue"
  }
  ```

- Install [Stylus extension](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for Stylus support

## Roadmap

- [x] Build a language server
- [x] IntelliSense for css/scss
- [x] Basic IntelliSense for js/es6 in `<script>`
- [ ] Error checking for html
- [ ] Error checking for css/scss
- [ ] Jump to definition
- [ ] Advanced IntelliSense based on scope (using vscode-textmate), such as suggest js variables in `v-if` attributes
- [ ] IntelliSense that understands API, such as suggesting state/getters for `this.$store` 

## Credits

- Logo from [vuejs/vuejs.org](https://github.com/vuejs/vuejs.org)
- Grammar based on [vuejs/vue-syntax-highlight](https://github.com/vuejs/vue-syntax-highlight)
- Sass grammar based on [P233/Syntax-highlighting-for-Sass](https://github.com/P233/Syntax-highlighting-for-Sass)
- JS grammar based on [atom/language-javascript](https://github.com/atom/language-javascript)
- Language Server based on VSCode's [html extension](https://github.com/Microsoft/vscode/tree/master/extensions/html)

## License

MIT © [Pine Wu](https://github.com/octref) 
