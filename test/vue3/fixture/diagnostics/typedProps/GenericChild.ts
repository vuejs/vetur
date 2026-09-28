import { defineComponent } from 'vue';
interface Payload { id: number; label: string }
interface Props { payload: Payload; optionalLabel?: string }
const Child = defineComponent<Props>({});

export default Child;
