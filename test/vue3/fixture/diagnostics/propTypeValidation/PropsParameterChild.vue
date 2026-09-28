<script lang="ts">
import { defineComponent } from 'vue';

interface Props {
  title: string;
  enabled?: boolean;
  items: string[];
}

export default defineComponent<Props>({});
</script>
