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
