import { renderHelperName, componentHelperName, iterationHelperName } from './transformTemplate';

// This bridge file will be injected into TypeScript language service
// it enable type checking and completion, yet still preserve precise option type

export const moduleName = 'vue-editor-bridge';

export const fileName = 'vue-temp/vue-editor-bridge.ts';

const renderHelpers = `
type ComponentListeners<T> = {
  [K in keyof T]?: ($event: T[K]) => any;
};
interface ComponentData<T> {
  props: Record<string, any>;
  on: ComponentListeners<T>;
  directives: any[];
}
export declare const ${renderHelperName}: {
  <T>(Component: (new (...args: any[]) => T), fn: (this: T) => any): any;
};
export declare const ${componentHelperName}: {
  <T>(
    vm: T,
    tag: string,
    data: ComponentData<Record<string, any>> & ThisType<T>,
    children: any[]
  ): any;
};
export declare const ${iterationHelperName}: {
  <T>(list: T[], fn: (value: T, index: number) => any): any;
  <T>(obj: { [key: string]: T }, fn: (value: T, key: string, index: number) => any): any;
  (num: number, fn: (value: number) => any): any;
  <T>(obj: object, fn: (value: any, key: string, index: number) => any): any;
};
`;

export const oldContent =
  `
import Vue from 'vue';
export interface GeneralOption extends Vue.ComponentOptions<Vue> {
  [key: string]: any;
}
export default function bridge<T>(t: T & GeneralOption): T {
  return t;
}
` + renderHelpers;

export const content =
  `
import Vue from 'vue';
const func = Vue.extend;
export default func;
` + renderHelpers;
