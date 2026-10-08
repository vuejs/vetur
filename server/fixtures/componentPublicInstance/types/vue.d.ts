/**
 * Props-relevant slice of Vue 3.2.47
 * packages/runtime-core/src/componentPublicInstance.ts
 * `export type ComponentPublicInstance` (parameter order and `$props`).
 *
 * P is parameter 0. PublicProps is parameter 6 and defaults to P.
 * Defaults is parameter 7. `$props` is `P & PublicProps` unless
 * MakeDefaultsOptional is true, in which case it is
 * `Partial<Defaults> & Omit<P & PublicProps, keyof Defaults>`.
 */
export type ComponentPublicInstance<
  P = {},
  B = {},
  D = {},
  C = {},
  M = {},
  E = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  Options = {},
  I = {}
> = {
  $data: D;
  $props: MakeDefaultsOptional extends true
    ? Partial<Defaults> & Omit<P & PublicProps, keyof Defaults>
    : P & PublicProps;
  $options: Options;
  $emit: (event: E, ...args: any[]) => void;
} & P;

/**
 * Props-relevant Vue 2.6/2.7 surface. Props remains argument 4 of
 * `CombinedVueInstance`; `Vue.extend` exposes the same Props argument
 * through `ExtendedVue`.
 */
export type CombinedVueInstance<
  Instance = {},
  Data = {},
  Methods = {},
  Computed = {},
  Props = {},
  SetupBindings = {}
> = Data & Methods & Computed & Props & Instance & SetupBindings;

export interface VueConstructor<V = {}> {
  new (): V;
}

export type ExtendedVue<
  Instance = {},
  Data = {},
  Methods = {},
  Computed = {},
  Props = {},
  SetupBindings = {}
> = VueConstructor<CombinedVueInstance<Instance, Data, Methods, Computed, Props, SetupBindings>>;

declare const Vue: {
  extend<Data = {}, Methods = {}, Computed = {}, Props = {}>(
    options: {}
  ): ExtendedVue<{}, Data, Methods, Computed, Props>;
};

export default Vue;
