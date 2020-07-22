# Framework Support

Vue libraries or frameworks can define custom components used in `<template>` region. For example, [`vue-router`](https://router.vuejs.org/) provides [`<router-link>`](https://router.vuejs.org/api/#router-link) component that could have attributes such as `to` and `replace`. Vetur currently provides autocomplete support for the component names and attributes.

Vetur currently provides framework support for the following vue libraries:

- [Vue Router](https://router.vuejs.org/)
- [Nuxt](https://nuxtjs.org/)
- [Element UI](https://element.eleme.io/#/)
- [Onsen UI](https://onsen.io/)
- [Bootstrap Vue](https://bootstrap-vue.js.org/)
- [Buefy](https://buefy.org/)
- [Vuetify](https://vuetifyjs.com/en/)
- [Quasar Framework](https://quasar.dev/)
- [Gridsome](https://gridsome.org/)

🚧 The data format is not specified yet. 🚧

## Usage

Vetur reads the `package.json` **in your project root** to determine if it should offer tags & attributes completions. Here are the exact dependencies and sources of their definitions.

| Dependency | Source |
|---|---|
| `vue-router` | [Vetur](https://github.com/vuejs/vetur/blob/master/server/src/modes/template/tagProviders/routerTags.ts) |
| `element-ui` | [element-helper-json](https://github.com/ElementUI/element-helper-json) |
| `vue-onsenui` | [vue-onsenui-helper-json](https://www.npmjs.com/package/vue-onsenui-helper-json) |
| `bootstrap-vue` | Bundled in [BootstrapVue v2.1+](https://www.npmjs.com/package/bootstrap-vue). Pre v2.1 uses [bootstrap-vue-helper-json](https://github.com/bootstrap-vue/bootstrap-vue-helper-json) |
| `buefy` | Bundled in [buefy](https://www.npmjs.com/package/buefy) |
| `vuetify` | Bundled in [vuetify](https://www.npmjs.com/package/vuetify) |
| `gridsome` | [gridsome-helper-json](https://github.com/gridsome/gridsome-helper-json) |
| `nuxt` | Bundled in [@nuxt/vue-app](https://www.npmjs.com/package/@nuxt/vue-app) package, or fallback to [nuxt-helper-json](https://github.com/nuxt-community/nuxt-helper-json) with [@nuxt/components](https://github.com/nuxt/components) integration |
| `nuxt-edge` | Bundled in [@nuxt/vue-app-edge](https://www.npmjs.com/package/@nuxt/vue-app-edge) package, or fallback to [nuxt-helper-json](https://github.com/nuxt-community/nuxt-helper-json) with [@nuxt/components](https://github.com/nuxt/components) integration |
| `quasar` / `quasar-framework` | Bundled in [quasar](https://www.npmjs.com/package/quasar) (v1+) and [quasar-framework](https://www.npmjs.com/package/quasar-framework) (pre v1) packages |

Getting `element-ui`'s completions is as easy as running `yarn add element-ui` and reloading VS Code.

## Custom Tags / Attributes

If a package listed in `dependencies` has a `vetur` key, then Vetur will try to read the tags / attributes specified by that key.

```json
{
  "vetur": {
    "tags": "dist/vetur/tags.json",
    "attributes": "dist/vetur/attributes.json"
  }
}
```

By bundling the tags / attributes definitions together with the framework library, you ensure that users will always get the matching tags / attributes with the specific version of your library they are using.

## Workspace Custom Tags

You can define custom tags/attributes for your workspace by specifying a `vetur` key in package.json. For example, to get auto completion for tag `<foo-tag>`, all you need to do is:

- Create a file `tags.json` with:

  ```json
  { "foo-bar": { "description": "A foo tag" } }
  ```

- Add this line to `package.json`:

  ```json
  {
    "vetur": { "tags": "./tags.json" }
  }
  ```

- Reload VS Code. You'll get `foo-bar` when completing `<|`.

## Adding a Framework

If your Vue UI framework has a lot of users, we might consider bundling its support in Vetur. However, this means Vetur's definition for the framework might become outdated.

Here are the two PRs for [Element](https://github.com/vuejs/vetur/pull/234) and [Onsen](https://github.com/vuejs/vetur/pull/308). Open an issue for discussion first before sending PR.

However, you should first consider adding `vetur` key to your `package.json` and publishing the tags / attributes together with your package (just as you do for `d.ts` files).
