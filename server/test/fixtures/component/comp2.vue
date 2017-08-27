<script lang="ts">
const weirdProp = String;
export default {
  props: {
    propname: String,
    weirdProp,
    anotherProp: {
      type: Number,
    }
  }
};
</script>
