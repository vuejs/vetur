# vetur

Vue tooling for VSCode.  

## Implemented Features

- Syntax highlighting for:
  - jade/html
  - css/sass/scss/less/stylus
  - js
- emmet for html in `<template>`

## Demo

Try for your self on this file: [demo/vetur.vue](https://github.com/octref/vetur/blob/master/demo/vetur.vue).

![demo](https://raw.githubusercontent.com/octref/vscode-jmespath/master/media/json-transform.gif)

## Setup

- Install [vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)
- In your user settings, set

  ```json
  "files.associations": {
    "*.vue": "vue"
  }
  ```

- Install [Stylus extension](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for Stylus support.

## Roadmap

- [ ] Error checking for html
- [ ] Error checking for css/scss
- [ ] IntelliSense for css/scss
- [ ] Basic IntelliSense for js/es6 in `<script>`, like suggesting props for `this.`
- [ ] Jump to definition
- [ ] Basic IntelliSense for js/es6 in `<template>`
- [ ] Advanced IntelliSense, such as suggesting state/getters for `this.$store` 
- [ ] Advanced features enabled through language server, such as hover

## Credits

- Logo from [vuejs/vuejs.org](https://github.com/vuejs/vuejs.org)
- Grammar based on [vuejs/vue-syntax-highlight](https://github.com/vuejs/vue-syntax-highlight)
- Sass based on [P233/Syntax-highlighting-for-Sass](https://github.com/P233/Syntax-highlighting-for-Sass)

## License

MIT © [Pine Wu](https://github.com/octref) 
