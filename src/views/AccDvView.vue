<script setup lang="ts">
import { ref, reactive, watch } from "vue"

import { loadDataFromVersion, getDataForOptions } from '@/core/main'
import D3AccDvChart from "@/components/D3AccDvChart.vue";

await loadDataFromVersion('0.3.107')

// Options that affect the final calculation
const options = reactive({
  numFuelTanks: 10,
  payload: 2000,
  radiatorName: "TinDroplet",
  spiker: null,
  hydrogen: null,
  defaultPowerPlantName: 'SolidCoreFissionReactorVIII'
})

let data = ref(getDataForOptions(options))


// Interactivity
watch(options, (newOptions) => {
  data.value = getDataForOptions(newOptions)
})

function processData() {
  // Processes the raw data obtained from the core logic module
  // into a format that can be easily and directly consumed by the D3 component
  //
  // Any logic related to rearranging existing data, as opposed to
  // recalculating new Drive related values (accels, dvs, etc)
  // comes here

  // TODO: Pick here the appropriate 1 to 6 drive inside the drives array
}
</script>

<template>
  <main>
    <label>Fuel tanks
      <input type="number" v-model="options.numFuelTanks" min="1"/>
    </label>
    <label>Payload
      <input type="number" v-model="options.payload" step="50"/>
    </label>
    <D3AccDvChart :data="data"/>
  </main>
</template>
