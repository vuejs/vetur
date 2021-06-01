# Setup

## Extensions

- Install [Sass](https://marketplace.visualstudio.com/items?itemName=Syler.sass-indented) for sass syntax highlighting.
- Install [language-stylus](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for stylus syntax highlighting.
- Install [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for linting vue and js files.

## VS Code Config

- Add `vue` to your `eslint.validate` setting, for example:

  ```json
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "vue"
  ]
  ```

## Project Setup

- At project root exist `package.json` file, Vetur use it for infer vue version and get component date.
- At project root create a `jsconfig.json` or `tsconfig.json` that `include` all vue files and files that they import from, for example:

- `jsconfig.json`

  ```json
    {
      "include": [
        "./src/**/*"
      ]
    }
  ```

- `tsconfig.json`

  ```json
    {
      "include": [
        "./src/**/*"
      ],
      "compilerOptions": {
        "module": "es2015",
        "moduleResolution": "node",
        "target": "es5",
        "sourceMap": true,
        "allowJs": true
      }
    }
  ```
- [What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Reference](https://www.typescriptlang.org/tsconfig)

#### jsconfig vs tsconfig

- Use `tsconfig` for pure TS project.
- Use `jsconfig` for pure JS project.
- Use `jsconfig` or `tsconfig` with `allowJs: true` for mixed JS / TS project.

### Path mapping

If you are using [Webpack's alias](https://webpack.js.org/configuration/resolve/) or [TypeScript's path mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html) to resolve components, you need to update Vetur's `tsconfig.json` or `jsconfig.json`.

For example:

```html
└── src
    ├── components
    │   ├── a.vue
    │   └── b.vue
    ├── containers
    │   └── index.vue
    ├── index.js
    └── jsconfig.json
```

jsconfig.json:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "components/*": [
                "src/components/*"
            ]
        }
    }
}
```

index.vue

```javascript
import a from 'components/a.vue'
import b from 'components/b.vue'
```

## Typescript

You need to add a shim type file to import a Vue SFC in a Typescript file.
### Vue2
```typescript
// shims-vue.d.ts
declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}
```
### Vue3
```typescript
// shims-vue.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```


## Advanced
If you use monorepo or VTI or `package.json` and `tsconfig.json/jsconfig.json` do not exist at project root, you can use `vetur.config.js` for advanced setting.

Please add `vetur.config.js` at project root or monorepo project root.
```javascript
// vetur.config.js
/** @type {import('vls').VeturConfig} */
module.exports = {
  // **optional** default: `{}`
  // override vscode settings
  // Notice: It only affects the settings used by Vetur.
  settings: {
    "vetur.useWorkspaceDependencies": true,
    "vetur.experimental.templateInterpolationService": true
  },
  // **optional** default: `[{ root: './' }]`
  // support monorepos
  projects: [
    './packages/repo2', // Shorthand for specifying only the project root location
    {
      // **required**
      // Where is your project?
      // It is relative to `vetur.config.js`.
      root: './packages/repo1',
      // **optional** default: `'package.json'`
      // Where is `package.json` in the project?
      // We use it to determine the version of vue.
      // It is relative to root property.
      package: './package.json',
      // **optional**
      // Where is TypeScript config file in the project?
      // It is relative to root property.
      tsconfig: './tsconfig.json',
      // **optional** default: `'./.vscode/vetur/snippets'`
      // Where is vetur custom snippets folders?
      snippetFolder: './.vscode/vetur/snippets',
      // **optional** default: `[]`
      // Register globally Vue component glob.
      // If you set it, you can get completion by that components.
      // It is relative to root property.
      // Notice: It won't actually do it. You need to use `require.context` or `Vue.component`
      globalComponents: [
        './src/components/**/*.vue'
      ]
    }
  ]
}
```

- [Read more `vetur.config.js` reference](/reference/).
- [Read RFC](https://github.com/vuejs/vetur/blob/master/rfcs/001-vetur-config-file.md).

## Yarn PnP
Vetur supports this feature now, but has some limits.

- Don't mix common project and pnp project in multi-root/monorepo
- Prettier doesn't support Yarn PnP, so can't load plugin automatically.
