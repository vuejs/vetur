<script>
import { Vue, Component, Prop, PropSync, Model } from 'vue-property-decorator'

@Component({
  props: { foo: Number }
})
export default class Child extends Vue {
  @Prop(Number) bar
  @Prop({ default: 'car' }) car
  @Prop({ required: false }) dar
  @Prop({ required: true }) ear
  @Prop([String, Number]) far
  @PropSync('name', { type: String }) syncedName
  @Model('change', { required: true }) checked
}
</script>
