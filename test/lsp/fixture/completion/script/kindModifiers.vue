<script lang="ts">
export const getData = () => {
  interface Data {
    a?: { b?: 1 }
    /** @deprecated no d */
    d: 2
  }

  const res: Data = {
    d: 2
  }

  res.a.
}

getData()
</script>
