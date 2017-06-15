// this bridge file will be injected into TypeScript service
// it enable type checking and completion, yet still preserve precise option type

export const moduleName = 'vue-editor-bridge';

export const fileName = 'vue-temp/vue-editor-bridge.ts';

export const content = `
import Vue from 'vue'
export default function test<T>(t: T & Vue.ComponentOptions<{}>): T {
  return t
}`;
