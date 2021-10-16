<script lang="ts">
import { PropType, defineComponent, ref, reactive } from "vue";

export default defineComponent({
  props: {
    str: String,
    bool: Boolean,
    callback: {
      type: Function as PropType<() => void>
    },
    arr: Array as PropType<string[]>,
    camelCase: { type: Boolean, default: false },
    modelValue: { type: Boolean, required: true },
    value: { type: Boolean, required: true }
  }
});
</script>
