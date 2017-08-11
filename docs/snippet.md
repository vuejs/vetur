# Snippet

Vetur lets you use snippets for each embedded languages.

For example, snippet defined for TypeScript will be available in the TypeScript region:
```html
<script lang="ts">
  // Use TS snippets here
</script>
```

Two exceptions:
- Use snippets for `vue-html` inside `<template></template>`
- Use `vue` snippets outside all regions

```html
<template>
  <!-- Use `vue-html` snippets here -->
</template>
<!-- Use `vue` snippets here -->
<style>
</style>
```

## Scaffold snippets

Vetur provides scaffolding snippets for quickly defining regions.  
They are `vue` snippets and can be used outside language regions.

`scaffold`
```html
<template>
  
</template>

<script>
export default {

}
</script>

<style>

</style>
```

`template with html`
```html
<template>

</template>
```

`style with scss`
```html
<style lang="scss">

</style>
```