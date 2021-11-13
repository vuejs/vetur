import { renderHelperName, componentHelperName, iterationHelperName, componentDataName } from './transformTemplate';

// This bridge file will be injected into TypeScript language service
// it enable type checking and completion, yet still preserve precise option type

export const moduleName = 'vue-editor-bridge';

export const fileName = 'vue-temp/vue-editor-bridge.ts';

const renderHelpers = `
type ComponentListeners<T, TH> = {
  [K in keyof T]?: (this: TH, $event: T[K]) => any;
};
export interface ${componentDataName}<T, TH> {
  props: Record<string, any>;
  on: ComponentListeners<T, TH>;
  directives: any[];
}
export declare const ${renderHelperName}: {
  <T>(Component: (new (...args: any[]) => T), fn: (this: T) => any): any;
};
export declare const ${componentHelperName}: {
  <T>(
    vm: T,
    tag: string,
    data: ${componentDataName}<Record<string, any>, T> & ThisType<T>,
    children: any[]
  ): any;
};
export declare const ${iterationHelperName}: {
  <T>(list: readonly T[], fn: (value: T, index: number) => any): any;
  <T>(obj: { [key: string]: T }, fn: (value: T, key: string, index: number) => any): any;
  (num: number, fn: (value: number, index: number) => any): any;
  <T>(obj: object, fn: (value: any, key: string, index: number) => any): any;
};
`;

export const preVue25Content =
  `
import Vue from 'vue';
export interface GeneralOption extends Vue.ComponentOptions<Vue> {
  [key: string]: any;
}
export default function bridge<T>(t: T & GeneralOption): T {
  return t;
}
` + renderHelpers;

export const vue25Content =
  `
import Vue from 'vue';
const func = Vue.extend;
export default func;
` + renderHelpers;

export const vue30Content =
  `
import { defineComponent } from 'vue';
const func = defineComponent;
export default func;
` + renderHelpers;
