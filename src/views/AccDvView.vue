<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue"

import { loadDataFromVersion, getDataForOptions, type Drive, type PowerPlant } from '@/core/main'
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

const driveCount = ref(1)

let data = ref(getDataForOptions(options))


// Interactivity
watch(options, (newOptions) => {
  data.value = getDataForOptions(newOptions)
})
const processedData = computed(() => {
  // Processes the raw data obtained from the core logic module
  // into a format that can be easily and directly consumed by the D3 component
  //
  // Any logic related to rearranging existing data, as opposed to
  // recalculating new Drive related values (accels, dvs, etc)
  // comes here
  return data.value.map((pairing) => {
    const { drives, ...rest } = pairing
    const driveIndex = Math.min(driveCount.value - 1, drives.length - 1)
    return { ...rest, drive: drives[driveIndex] }
  })
})
</script>

<template>
  <main>
    <label>Fuel tanks
      <input type="number" v-model="options.numFuelTanks" min="1"/>
    </label>
    <label>Payload
      <input type="number" v-model="options.payload" step="50" min="1"/>
    </label>
    <label>Drive count
      <input type="number" v-model="driveCount" min="1" max="6"/>
    </label>
    <D3AccDvChart :data="processedData"/>
  </main>
</template>
