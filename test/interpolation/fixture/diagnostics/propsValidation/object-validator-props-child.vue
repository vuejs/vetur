<script>
const propertyAssignmentDefault = {
  type: Boolean,
  default: false,
};

const propertyAssignmentRequired = {
  type: Boolean,
  required: true,
};

const propertyAssignmentNoDefaultRequired = {
  type: Boolean,
};

export default {
  model: {
    prop: 'foo'
  },
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
    },
    withDefault: propertyAssignmentDefault,
    withRequired: propertyAssignmentRequired,
    noDefaultRequired: propertyAssignmentNoDefaultRequired
  }
}
</script>
