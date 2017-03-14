# vetur

Vue tooling for VSCode.  

This extension is in development and not stable yet.  
You can [open an issue](https://github.com/octref/vetur/issues/new) for bugs or feature requests.

## Implemented Features

- Basic IntelliSense for html/css/scss/less/js
- Advanced IntelliSense to suggest `v-` directives and `key`, `ref`, `slot` as html attributes
- Linting for css/scss/less/js
- Formatting for html/css/scss/less/js (Temporarily disabled, see [#82](https://github.com/octref/vetur/issues/82))
- Syntax highlighting for:
  - html/jade/pug
  - css/sass/scss/less/stylus/postcss
  - js/ts/coffee
- Embedded snippet support
  - Use vue snippet outside all regions
  - Use each language's snippet inside its region (Only for self-defined snippet now, extension-contributed snippet will be available when [VSCode#21046](https://github.com/Microsoft/vscode/issues/21046) is resolved)
- Emmet for html/css/sass/scss/less

## Demo

Try for yourself on this file: [demo/vetur.vue](https://github.com/octref/vetur/blob/master/demo/vetur.vue).

## Setup

- Install [vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)

### Optional Setup

**Emmet**:

- In your user settings, set

  ```json
  "emmet.syntaxProfiles": {
    "vue-html": "html",
    "vue": "html"
  }
  ```

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

**Stylus**:

- Install [Stylus extension](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for Stylus support

**VSCode < 1.10**

- In your user settings, set

  ```json
  "files.associations": {
    "*.vue": "vue"
  }
  ```

## Roadmap

- [x] Build a language server
- [x] IntelliSense for css/scss
- [x] Basic IntelliSense for js/es6 in `<script>`
- [x] Error checking for css/scss/less
- [x] Snippet for embedded languages
- [x] Embedded formatter for html/css/scss/less/js (Reworking, see [#82](https://github.com/octref/vetur/issues/82))
- [x] Advanced IntelliSense (In progress, see [#26](https://github.com/octref/vetur/issues/26))
- [ ] Jump to definition
- [ ] Debugging embedded JS by setting breakpoints directly

## Related

- [octref/vls](https://github.com/octref/vls): vue language server, used to provide advanced IntelliSense

## Contribution

See [CONTRIBUTING.md](https://github.com/octref/vetur/blob/master/CONTRIBUTING.md)

## Credits

- Logo from [vuejs/vuejs.org](https://github.com/vuejs/vuejs.org)
- Grammar based on [vuejs/vue-syntax-highlight](https://github.com/vuejs/vue-syntax-highlight)
- Sass grammar based on [P233/Syntax-highlighting-for-Sass](https://github.com/P233/Syntax-highlighting-for-Sass)
- PostCSS grammar based on [azat-io/atom-language-postcss](https://github.com/azat-io/atom-language-postcss)
- Language Server based on VSCode's [html extension](https://github.com/Microsoft/vscode/tree/master/extensions/html)
- Formatter based on [beautify-web/js-beautify](https://github.com/beautify-web/js-beautify)
- Formatter default options based on [victorporof/Sublime-HTMLPrettify](https://github.com/victorporof/Sublime-HTMLPrettify)

## License

MIT © [Pine Wu](https://github.com/octref) 
