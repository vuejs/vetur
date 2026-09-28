<script lang="ts">
import Vue, { PropType } from 'vue';
interface Payload { id: number; label: string }
export default Vue.extend({
  props: {
    payload: { type: Object as PropType<Payload>, required: true },
    camelCase: { type: String as PropType<'ready' | 'waiting'>, default: 'ready' }
  }
});
</script>
