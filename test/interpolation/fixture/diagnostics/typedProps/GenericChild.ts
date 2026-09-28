import Vue from 'vue';
interface Payload { id: number; label: string }
interface Props { payload: Payload; optionalLabel?: string }
const Child = Vue.extend<{}, {}, {}, Props>({});

export default Child;
