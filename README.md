# vetur

Vue tooling for VSCode.  

This extension is in development and not stable yet.  
You can [open an issue](https://github.com/octref/vetur/issues/new) for bugs or feature requests.

## Implemented Features

- IntelliSense for html/css/scss/less/js
- Linting for css/scss/less/js
- Syntax highlighting for:
  - html/jade/pug
  - css/sass/scss/less/stylus
  - js/ts
- emmet for `<template>`

## Demo

Try for yourself on this file: [demo/vetur.vue](https://github.com/octref/vetur/blob/master/demo/vetur.vue).

## Setup

- Install [vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)
- In your user settings, set

  ```json
  "files.associations": {
    "*.vue": "vue"
  }
  ```

### Optional Setup

**ESLint** for linting `<script>` section:

- Install [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- Add `vue` to your `eslint.validate` setting, for example:

  ```json
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "vue"
  ]
  ```

**Emmet** for css/less/scss:

- Add the following to your settings:

  ```json
  "emmet.syntaxProfiles": {
    "vue": "css"
  }
  ```

**Stylus**:

- Install [Stylus extension](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for Stylus support

## Roadmap

- [x] Build a language server
- [x] IntelliSense for css/scss
- [x] Basic IntelliSense for js/es6 in `<script>`
- [x] Error checking for css/scss/less
- [ ] Advanced IntelliSense [#26](https://github.com/octref/vetur/issues/26)
- [ ] Jump to definition
- [ ] Debugging embedded JS by setting breakpoints directly

## Credits

- Logo from [vuejs/vuejs.org](https://github.com/vuejs/vuejs.org)
- Grammar based on [vuejs/vue-syntax-highlight](https://github.com/vuejs/vue-syntax-highlight)
- Sass grammar based on [P233/Syntax-highlighting-for-Sass](https://github.com/P233/Syntax-highlighting-for-Sass)
- JS grammar based on [atom/language-javascript](https://github.com/atom/language-javascript)
- Language Server based on VSCode's [html extension](https://github.com/Microsoft/vscode/tree/master/extensions/html)

## License

MIT © [Pine Wu](https://github.com/octref) 
