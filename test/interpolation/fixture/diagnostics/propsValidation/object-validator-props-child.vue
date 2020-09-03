<script>
export default {
  props: {
    foo: {
      type: String,
      required: true
    },
    bar: {
      type: String,
      required: true
    },
    car: {
      type: String,
      required: false
    },
    dar: {
      type: String,
      default: 'dar'
    }
  }
}
</script>
