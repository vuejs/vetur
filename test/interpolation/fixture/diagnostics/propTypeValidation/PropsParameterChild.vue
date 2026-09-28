<script lang="ts">
import Vue from 'vue';

interface Props {
  title: string;
  enabled?: boolean;
  items: string[];
}

export default Vue.extend<{}, {}, {}, Props>({});
</script>
