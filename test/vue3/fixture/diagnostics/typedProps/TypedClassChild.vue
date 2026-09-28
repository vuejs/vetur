<script lang="ts">
import { Vue, Options, prop } from 'vue-class-component';
interface Payload { id: number; label: string }
class Props {
  payload = prop<Payload>({ required: true });
  optionalLabel = prop<string>({ default: 'ok' });
}
@Options({})
export default class TypedClassChild extends Vue.with(Props) {}
</script>
