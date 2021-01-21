<script lang="ts">
import { PropType, defineComponent, ref, reactive } from "vue";

export default defineComponent({
  emits: {
    null: null,
    non: () => true,
    one: (a: string) => true,
    two: (a: boolean, b: string[]) => true,
    rest: (a: string, ...args: number[]) => true
  }
});
</script>
