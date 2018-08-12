# Framework Support

Vue frameworks can define custom components used in `<template>` region. For example, `vue-router` provides `<router-link>` component that could have attributes such as `to` and `replace`. Vetur currently provides autocomplete support for the component names and attributes.

Vetur currently provides framework support for the following vue libraries:

- [Vue Router](https://router.vuejs.org/)
- [Element UI](https://element.eleme.io/#/)
- [Onsen UI](https://onsen.io/)
- [Bootstrap Vue](https://bootstrap-vue.js.org/)
- [Buefy](https://buefy.github.io/#/)
- [Vuetify](https://vuetifyjs.com/en/)
- [Quasar Framework](https://quasar-framework.org/)

#### Usage

When you have `element-ui` or `vue-onsenui` as a dependency in your Vue project, Vetur will automatically provide html tag & attribute suggestions from these frameworks.

#### Adding a Framework

If your Vue UI framework has a lot of users, we might consider adding support for it in Vetur.

Here are the two PRs for [Element](https://github.com/vuejs/vetur/pull/234) and [Onsen](https://github.com/vuejs/vetur/pull/308). 

Open an issue for discussion first before sending PR.

#### IntelliSense based on Custom Component Set

We realize it's a common use case for teams to have their own set of reusable components, and would like to have IntelliSense based on them.

We look forward to support IntelliSense based on such custom component set. Follow [#276](https://github.com/vuejs/vetur/issues/276).