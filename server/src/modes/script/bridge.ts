// this bridge file will be injected into TypeScript service
// it enable type checking and completion, yet still preserve precise option type

export const moduleName = 'vue-editor-bridge';

export const fileName = 'vue-temp/vue-editor-bridge.ts';

const renderHelpers = `
export interface RenderHelpers {
  _o: Function
  _n: Function
  _s: Function
  _l: Function
  _t: Function
  _q: Function
  _i: Function
  _m: Function
  _f: Function
  _k: Function
  _b: Function
  _v: Function
  _e: Function
  _u: Function
  _c: Function
  _self: this
}`;

export const oldContent = `
import Vue from 'vue';
export interface GeneralOption extends Vue.ComponentOptions<Vue> {
  [key: string]: any;
}
export default function bridge<T>(t: T & GeneralOption): T {
  return t;
}
` + renderHelpers;

export const content = `
import Vue from 'vue';
const func = Vue.extend;
export default func;
` + renderHelpers;
