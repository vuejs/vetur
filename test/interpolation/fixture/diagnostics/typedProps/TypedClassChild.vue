<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
interface Payload { id: number; label: string }
@Component
export default class TypedClassChild extends Vue {
  @Prop({ required: true }) payload!: Payload;
}
</script>
