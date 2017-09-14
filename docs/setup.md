# Setup

### Overall

- Set up a `jsconfig.json` or `tsconfig.json` that `include` all vue files and files that they import from, for example:

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

### Path mapping

- If you want to get intellisense of go to definition or component and props autocomplete when use absolute path.You can set example below.

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

`jsconfig.json`

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

```html
import a from 'components/a.vue'
import b from 'components/b.vue
```

### ESLint

- Install [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- Add `vue` to your `eslint.validate` setting, for example:

  ```json
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "vue"
  ]
  ```

 - AutoFix Eslint Error after save

  ```json
"eslint.autoFixOnSave": true,
"eslint.validate": [
    {
        "language": "javascript",
        "autoFix": true
    },
    {
        "language": "vue",
        "autoFix": true
    }
]
  ```


### Sass

- Install [Sass extension](https://marketplace.visualstudio.com/items?itemName=robinbentley.sass-indented) for Sass support

### Stylus

- Install [Stylus extension](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) for Stylus support
