- Start Date: 2020-10-14
- Target Major Version: 2.x & 3.x
- Reference Issues: https://github.com/vuejs/vetur/issues/2325, https://github.com/vuejs/vetur/issues/2243, https://github.com/vuejs/vetur/issues/1635, https://github.com/vuejs/vetur/issues/815, https://github.com/vuejs/vetur/issues/424
- Implementation PR: (leave this empty)

# Summary
A new configuration file for Vetur and VTI

# Basic example

```javascript
// vetur.config.js
/** @type {import('vls').VeturConfig} */
module.exports = {
  // **optional** default: `{}`
  // override vscode settings part
  // Notice: It only affects the settings used by Vetur.
  settings: {
    "vetur.useWorkspaceDependencies": true,
    "vetur.experimental.templateInterpolationService": true
  },
  // **optional** default: `[{ root: './' }]`
  // support monorepos
  projects: [
    './packages/repo2', // shorthand for only root.
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

# Motivation
- The VTI need some method to set configuration.
- The monorepo need a baseline or logic.
- VSCode workspace config is own by vscode. I don't want to commit it in git.
- Shared settings required for team projects.
- Register global vue component.

# Detailed design

## Noun
- Vetur: a VSCode extension for Vue support.
- VTI: a CLI for Vue file type-check, diagnostics or some feature.
- VLS: vue language server, The core of everything. It is base on [language server protocol](https://microsoft.github.io/language-server-protocol/).

## Config file spec
- All path formats are used with `/`.
  > Helpful for cross-platform use project.
- Only support commonjs format.
  > We can use it quickly and directly.
- Use pure JavaScript.
  > Same as above.
  > You can get typings like `@JSDoc`.
- UTF-8 charset

## How to use

### VTI
You can use it to override VTI default settings.
```bash
vti `action`
vti -c vetur.config.js `action`
vti --config vetur.config.js `action`
```

### Vetur
This profile takes precedence over vscode setting.
It will find it when Vetur initialization.
If it isn't exist, It will use `{ settings: {}, projects: ['./'] }`.
This will ensure consistency with past behavior.

### How to find `vetur.config.js`
- Start from the root and work your way up until the file is found.
- The root is set `process.cwd()` value in VTI and you can set file path in CLI params.

PS. Each root can have its own vetur.config.js in VSCode Multi root feature.

## Property detail

### Definition
```typescript
type Glob = string

export interface VeturConfig {
  settings?: { [key: string]: boolean | string | Enum },
  projects?: Array<string | {
    root: string,
    package?: string,
    tsconfig?: string,
    snippetFolder?: string,
    globalComponents?: Array<Glob | { name: string, path: string }>
  }>
}
```

### `settings`
Incoming to vue language server config.

In VLS, it will merge (vscode setting or VTL default config) and vetur.config.js `settings`.
```typescript
import _ from 'lodash'

// original vscode config or VTI default config
const config: VLSFullConfig = params.initializationOptions?.config
  ? _.merge(getDefaultVLSConfig(), params.initializationOptions.config)
  : getDefaultVLSConfig();

// From vetur.config.js
const veturConfig = getVeturConfigInWorkspace()
// Merge vetur.config.js
Object.keys(veturConfig.setting).forEach((key) => {
  _.set(config, key, veturConfig.setting[key])
})
```

Notice: It only affects the settings used by Vetur.
For example, we use `typescript.preferences.quoteStyle` in Vetur. so you can set it.
But it don't affect original TypeScript support in VSCode.

### `projects`
The monorepo need a baseline or logic.
Possible options are `package.json` or `tsconfig.js`.
But both are used for node and typescript projects.
We're likely to waste unnecessary resources on things we don't need.
So I figured the best way to do it was through the setup.

For detailed discussion, see this [RFC](https://github.com/vuejs/vetur/pull/2377).

if `projects[]` is only a string, It is a shorthand when you only need to define `root`.

### `projects[].root`
All runtime dependencies is base on value of this property.
Like `typescript`, `prettier`, `@prettier/pug`.
Also Vetur find `./package.json` and `./tsconfig.js` by default.

### `projects[].package`
We can get the project name or dependency info from here.
But We only use it to determine the version of vue now.
But it doesn't rule out the use of more.

### `projects[].tsconfig`
Typescript project profile.
It's the key to helping us support JavaScript and TypeScript.
We also use it for support template interpolation.

#### Why isn't array?
If you are familiar with typescript, You know TypeScript allow support multiple discrete `tsconfig`.
But in the vue ecosystem, It's almost completely unsupported.
For example, We often use webpack to compile Vue projects.
The `vue-loader` call `ts-loader` for support typescript.
But `ts-loader` is only support only one `tsconfig.json`.

For these reasons, we also don't support it.
It can reduce development and maintenance costs.

PS. `jsconfig.json` is also support it.

### `projects[].snippetFolder`
Vetur Custom snippets folder path

### `projects[].globalComponents`
We have some amazing features, Like `template interpolation`.
But it only work when register component in component.
For example:
```javascript
import Comp from '@/components/Comp.vue'

export default {
  components: {
    Comp
  }
}
```

With this property available, we will parse vue component files that match the glob on vls startup.
You can support `template interpolation` for that components anywhere in the project.

This property allow two type values in array.
- Glob (`string`) [format](https://github.com/mrmlnc/fast-glob#pattern-syntax)
  Vetur will call glob lib with `projects[].root` for loading component when value is string.
  It use `path.basename(fileName, path.extname(fileName))` as component name.
- Object (`{ name: string, path: string }`)
  Vetur use this data directly.
  It's the most flexible way.
  If this is a relative path, It is based on `projects[].root`.

Notice: It won't actually do it. You need to use `require.context` and `Vue.component` in your project. [more](https://vuejs.org/v2/guide/components-registration.html#Automatic-Global-Registration-of-Base-Components)

# Drawbacks
- We need to guide the user through the new settings.
- Monorepo's support is not so automatic.
- Maintenance required to read configuration file code
- Working with multiple profiles may confuse users.

# Alternatives
- Use vscode configuration file.
- Put configuration to `vue.config.js`.
  > Additional communication with `vue-cli` maintainer is required.
- Use more cli params in VTI.

# Adoption strategy
No any breaking change on it.

To guide user,
We can add a dialog when open project,
Or open a help page when vetur extensions install,
and add help in the document in Vetur.

# Unresolved questions
- How to achieve Monorepo support?
  > Another RFC. https://github.com/vuejs/vetur/pull/2377
