# Global components

Vetur support define global components.
You can register template interpolation for that components anywhere in the project.

Please add `projects.globalComponents` in `vetur.config.js`.

## Example
When your project isn't a monorepo and `package.json/(ts|js)config.json` at project root.
```javascript
// vetur.config.js
/** @type {import('vls').VeturConfig} */
module.exports = {
  projects: [
    {
      root: './',
      // **optional** default: `[]`
      // Register globally Vue component glob.
      // If you set it, you can get completion by that components.
      // It is relative to root property.
      // Notice: It won't actually do it. You need to use `require.context` or `Vue.component`
      globalComponents: [
        './src/components/**/*.vue',
        {
          // Component name
          name: 'FakeButton',
          // Component file path, please use '/'.
          path: './src/app/components/AppButton.vue'
        }
      ]
    }
  ]
}
```

