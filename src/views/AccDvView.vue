<script setup lang="ts">
import { ref, reactive, watch } from "vue"

import { loadDataFromVersion, getDataForOptions } from '@/core/main'
import D3AccDvChart from "@/components/D3AccDvChart.vue";

await loadDataFromVersion('0.3.107')

// Options that affect the final calculation
const options = reactive({
  numFuelTanks: 10,
  payload: 2000
})

let data = ref(getDataForOptions(options))


// Interactivity
watch(options, (newOptions) => {
  data.value = getDataForOptions(newOptions)
})
</script>

<template>
  <main>
    <label>Fuel tanks
      <input type="number" v-model="options.numFuelTanks"/>
    </label>
    <label>Payload
      <input type="number" v-model="options.payload"/>
    </label>
    <D3AccDvChart :data="data"/>
  </main>
</template>
