# Component Data

Vue libraries or frameworks can define custom components used in `<template>` region. For example, [`vue-router`](https://router.vuejs.org/) provides [`<router-link>`](https://router.vuejs.org/api/#router-link) component that could have attributes such as `to` and `replace`. Of course, you can define custom components as well.

Component Data is JSON files that describe the components' tags / attributes declaratively. Vetur is able to load these JSON files to provide auto-completion, hover information and other language features for the Vue components.

The two main ways of utilizing Component Data are:
- Install a [supported framework](#supported-frameworks). Vetur will load its Component Data automatically to provide auto-completion and other features.
- [Workspace Component Data](#workspace-component-data). Vetur can load Component Data defined in your workspace and provide language features for your custom components.

🚧 The data format is not specified yet. 🚧

## Supported Frameworks

Vetur currently bundles Component Data for the following vue libraries:

- [Vue Router](https://router.vuejs.org/)
- [Nuxt](https://nuxtjs.org/)
- [Element UI](https://element.eleme.io/#/)
- [Onsen UI](https://onsen.io/)
- [Bootstrap Vue](https://bootstrap-vue.js.org/)
- [Buefy](https://buefy.org/)
- [Vuetify](https://vuetifyjs.com/en/)
- [Quasar Framework](https://quasar.dev/)
- [Gridsome](https://gridsome.org/)
- [Ionic Framework](https://ionicframework.com/)
- [BalmUI](https://material.balmjs.com/)

Vetur reads the `package.json` **in your project root** to determine if it should offer tags & attributes completions. Here are the exact `dependencies`/`devDependencies` used to determine which Component Data to load.

| `dependency` | `devDependency` | Source |
|---|---|---|
| `vue-router` | `vue-router` | [Vetur](https://github.com/vuejs/vetur/blob/master/server/src/modes/template/tagProviders/routerTags.ts) |
| `element-ui` | `elment-ui` | [element-helper-json](https://github.com/ElementUI/element-helper-json) |
| `vue-onsenui` | `vue-onsenui` | [vue-onsenui-helper-json](https://www.npmjs.com/package/vue-onsenui-helper-json) |
| `bootstrap-vue` | `bootstrap-vue` | Bundled in [BootstrapVue v2.1+](https://www.npmjs.com/package/bootstrap-vue). Pre v2.1 uses [bootstrap-vue-helper-json](https://github.com/bootstrap-vue/bootstrap-vue-helper-json) |
| `buefy` | `buefy` | Bundled in [buefy](https://www.npmjs.com/package/buefy) |
| `vuetify` | `vuetify` | Bundled in [vuetify](https://www.npmjs.com/package/vuetify) |
| `gridsome` || [gridsome-helper-json](https://github.com/gridsome/gridsome-helper-json) |
| `nuxt` | `nuxt` | Bundled in [@nuxt/vue-app](https://www.npmjs.com/package/@nuxt/vue-app) package, or fallback to [nuxt-helper-json](https://github.com/nuxt-community/nuxt-helper-json) with [@nuxt/components](https://github.com/nuxt/components) integration |
| `nuxt-edge` | `nuxt-edge` | Bundled in [@nuxt/vue-app-edge](https://www.npmjs.com/package/@nuxt/vue-app-edge) package, or fallback to [nuxt-helper-json](https://github.com/nuxt-community/nuxt-helper-json) with [@nuxt/components](https://github.com/nuxt/components) integration |
| `quasar` / `quasar-framework` | `quasar` / `quasar-cli` | Bundled in [quasar](https://www.npmjs.com/package/quasar) (v1+) and [quasar-framework](https://www.npmjs.com/package/quasar-framework) (pre v1) packages |
| `@ionic/vue` | `@ionic/vue` | Bundled in [@ionic/vue](https://www.npmjs.com/package/@ionic/vue) (v5.5.0+) |
| `balm-ui` | `balm-ui` | Bundled in [balm-ui](https://www.npmjs.com/package/balm-ui) (v8.49.0+) |

Getting `element-ui`'s completions is as easy as running `yarn add element-ui` and reloading VS Code.

### Other frameworks

If a package listed in `dependencies` has a `vetur` key in its `package.json`, then Vetur will try to read the tags / attributes specified by that key.

```json
{
  "vetur": {
    "tags": "dist/vetur/tags.json",
    "attributes": "dist/vetur/attributes.json"
  }
}
```

By bundling the tags / attributes definitions together with the framework library, you ensure that users will always get the matching tags / attributes with the specific version of your library they are using.

## Workspace Component Data

You can define custom tags/attributes for your workspace by specifying a `vetur` key in package.json. For example, to get auto completion for tag `<foo-tag>` and it's attribute `foo-attr`, all you need to do is:

- Create a file `tags.json` with:

  ```json
  { "foo-bar": { "description": "A foo tag", "attributes": ["foo-attr"] } }
  ```

- Create a file `attributes.json` with:

  ```json
  { "foo-bar/foo-attr": { "description": "description of foo-attr" } }
  ```

- Add this line to `package.json`:

  ```json
  {
    "vetur": { "tags": "./tags.json", "attributes": "./attributes.json" }
  }
  ```

- Reload VS Code. You'll get:  
  - `foo-bar` when completing `<|`
  - `foo-attr` when completing `<foo-bar |`  

## Adding a Framework

If your Vue UI framework has a lot of users, we might consider bundling its support in Vetur.

You should first consider adding `vetur` key to your `package.json` and publishing the tags / attributes together with your package (just as you would do for `d.ts` files). If you automate the process of generating the Component Data JSON from your source code, then users can always enjoy up-to-date support for your framework.

Here is an example of [Nuxt.js](https://nuxtjs.org/) adding Component Data support: https://github.com/vuejs/vetur/pull/1921.

