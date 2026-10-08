import { ComponentPublicInstance } from 'vue';

export interface ChildProps {
  label: string;
  active?: boolean;
}

declare const PublicInstanceCtor: {
  new (): ComponentPublicInstance<ChildProps, {}, {}, {}, {}, {}, ChildProps, any, true>;
};

export default class IndexChild extends PublicInstanceCtor {}
