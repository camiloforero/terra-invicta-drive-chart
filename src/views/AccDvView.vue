<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue"

import { loadDataFromVersion, getDataForOptions, radiatorDict, shipHullDict, hydrogenModuleDict, spikerDict } from '@/core/main'
import D3AccDvChart from "@/components/D3AccDvChart.vue";

await loadDataFromVersion('0.3.114')

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

let selectedHullName = ref('Battleship')
const selectedHull = computed(() => shipHullDict[selectedHullName.value])

// Interactivity
watch(options, (newOptions) => {
  data.value = getDataForOptions(newOptions)
})
watch(selectedHull, (hull) => {
  options.payload = hull.mass_tons
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
    <div>
      <h1>Terra Invicta Drive Efficiency Explorer</h1>
      <D3AccDvChart :data="processedData"/>
    </div>
    <div id="optionsSidebar">
      <label>Fuel tanks
        <input type="number" v-model="options.numFuelTanks" min="1"/>
      </label>
      <label>Hull
        <select v-model="selectedHullName">
          <option v-for="[key, hull] of Object.entries(shipHullDict)" :key="key" :value="key">{{ hull.friendlyName }}</option>
        </select>
      </label>
      <label>Payload
        <input type="number" v-model="options.payload" step="100" :min="selectedHull.mass_tons"/>
      </label>
      <label>Drive count
        <input type="number" v-model="driveCount" min="1" max="6"/>
      </label>
      <label>Radiator
        <select v-model="options.radiatorName">
          <option v-for="[key, radiator] of Object.entries(radiatorDict)" :key="key" :value="key">{{ radiator.friendlyName }}</option>
        </select>
      </label>
      <label>Hydrogen
        <select v-model="options.hydrogen">
          <option v-for="[key, hydrogenModule] of Object.entries(hydrogenModuleDict)" :key="key" :value="key">{{ hydrogenModule.friendlyName }}</option>
          <option :value="null">None</option>
        </select>
      </label>
      <label>Spiker
        <select v-model="options.spiker">
          <option v-for="[key, spiker] of Object.entries(spikerDict)" :key="key" :value="key">{{ spiker.friendlyName }}</option>
          <option :value="null">None</option>
        </select>
      </label>
    </div>
  </main>
  <footer>
    <a href="https://github.com/camiloforero/terra-invicta-drive-chart"><font-awesome-icon icon="fa-brands fa-github" /></a>
  </footer>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: row;
}

#optionsSidebar {
  display: flex;
  flex-direction: column;
}
</style>

