<script lang="ts">
const weirdProp = String;
import Vue from 'vue';
export default Vue.extend({
  props: {
    propname: String,
    weirdProp,
    anotherProp: {
      type: Number,
    }
  }
});
</script>
