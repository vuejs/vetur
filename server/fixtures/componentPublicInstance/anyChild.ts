import { ComponentPublicInstance } from 'vue';

export interface ChildProps {
  title: string;
  count?: number;
}

declare const PublicInstanceCtor: {
  new (): ComponentPublicInstance<ChildProps>;
};

export default class AnyChild extends PublicInstanceCtor {}
