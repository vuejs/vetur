import Vue from 'vue';

export interface ChildProps {
  value: string;
  count?: number;
}

export default Vue.extend<{}, {}, {}, ChildProps>({});
