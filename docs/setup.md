# Setup

- Set up a `jsconfig.json` or `tsconfig.json` that `includes` all vue files and files that they import from, for example:

  - `jsconfig`

```json
  {
    "include": [
      "./src/**/*"
    ]
  }
```

  - `tsconfig`

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
