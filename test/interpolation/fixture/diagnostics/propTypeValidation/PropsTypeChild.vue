<script lang="ts">
interface PropsTypeChildProps {
  requiredText: string;
  optionalCount?: number;
}

export default class PropsTypeChild {
  $props!: PropsTypeChildProps;
}
</script>
