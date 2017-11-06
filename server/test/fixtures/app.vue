<script lang="ts">
import Comp from './component/comp.vue';
import Comp2 from '@comp/comp2.vue';
import test from 'mod';

Comp.data();
Comp2.props;
test.test.toFixed();
myGlobal.toFixed();

const Comp4 = {
  props: { inline: Number }
};

export default {
  components: {
    Comp: Comp,
    Comp2,
    Comp3: {
      props: ['inline']
    },
    Comp4
  }
}
</script>
