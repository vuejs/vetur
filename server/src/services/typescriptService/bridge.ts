import {
  renderHelperName,
  componentHelperName,
  iterationHelperName,
  componentDataName,
  injectComponentDataName
} from './transformTemplate';

// This bridge file will be injected into TypeScript language service
// it enable type checking and completion, yet still preserve precise option type

export const moduleName = 'vue-editor-bridge';

export const fileName = 'vue-temp/vue-editor-bridge.ts';

const renderHelpers = `
type ComponentListeners<T> = {
  [K in keyof T]?: ($event: T[K]) => any;
};
export interface ${componentDataName}<T> {
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
    data: ${componentDataName}<Record<string, any>> & ThisType<T>,
    children: any[]
  ): any;
};
export declare const ${iterationHelperName}: {
  <T>(list: readonly T[], fn: (value: T, index: number) => any): any;
  <T>(obj: { [key: string]: T }, fn: (value: T, key: string, index: number) => any): any;
  (num: number, fn: (value: number) => any): any;
  <T>(obj: object, fn: (value: any, key: string, index: number) => any): any;
};
`;

export const preVue25Content =
  `
import Vue from 'vue';
import type { ExtendedVue } from 'vue/types/vue'
export interface GeneralOption extends Vue.ComponentOptions<Vue> {
  [key: string]: any;
}
export default function bridge<T>(t: T & GeneralOption): T {
  return t;
}

export const ${injectComponentDataName} = <Instance extends Vue, Data, Methods, Computed, Props>(
  instance: ExtendedVue<Instance, Data, Methods, Computed, Props>
) => {
  return instance as ExtendedVue<Instance, Data, Methods, Computed, Props> & {
    __vlsComponentData: {
      props: Props & { [other: string]: any }
      on: ComponentListeners<ExtendedVue<Instance, Data, Methods, Computed, Props>>
      directives: any[]
    }
  }
}
` + renderHelpers;

export const vue25Content =
  `
import Vue from 'vue';
import type { ExtendedVue } from 'vue/types/vue'
const func = Vue.extend;
export default func;

export const ${injectComponentDataName} = <Instance extends Vue, Data, Methods, Computed, Props>(
  instance: ExtendedVue<Instance, Data, Methods, Computed, Props>
) => {
  return instance as ExtendedVue<Instance, Data, Methods, Computed, Props> & {
    __vlsComponentData: {
      props: Props & { [other: string]: any }
      on: ComponentListeners<ExtendedVue<Instance, Data, Methods, Computed, Props>>
      directives: any[]
    }
  }
}
` + renderHelpers;

export const vue30Content =
  `
import { defineComponent } from 'vue';
import type { Component, ComputedOptions, MethodOptions } from 'vue'

const func = defineComponent;
export default func;

export const ${injectComponentDataName} = <Props, RawBindings, D, C extends ComputedOptions, M extends MethodOptions>(
  instance: Component<Props, RawBindings, D, C, M>
) => {
  return instance as Component<Props, RawBindings, D, C, M> & {
    __vlsComponentData: {
      props: Props & { [other: string]: any }
      on: ComponentListeners<Component<Props, RawBindings, D, C, M>>
      directives: any[]
    }
  }
}
` + renderHelpers;
