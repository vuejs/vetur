<script lang="ts">
import Vue, { PropType } from 'vue';

export default Vue.extend({
  props: {
    str: String,
    bool: Boolean,
    callback: {
      type: Function as PropType<() => void>
    },
    arr: Array as PropType<string[]>,
    camelCase: { type: Boolean, default: false }
  }
});
</script>
