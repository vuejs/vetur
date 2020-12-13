<script>
import { PropType, defineComponent, ref, reactive } from "vue";

export default {
  emits: {
    null: null,
    non: () => true,
    one: a => true,
    two: (a, b) => true,
    rest: (a, ...args) => true
  }
};
</script>
