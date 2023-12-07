<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue"

import { loadDataFromVersion, getDataForOptions, radiatorDict, shipHullDict, hydrogenModuleDict, spikerDict, shipArmorDict } from '@/core/main'
import D3AccDvChart from "@/components/D3AccDvChart.vue";

const GAME_VERSION = '0.3.115'

await loadDataFromVersion(GAME_VERSION)

// Options that affect the final calculation
const options = reactive({
  numFuelTanks: 10,
  payload: 2000,
  radiatorName: "TinDroplet",
  spikerName: null,
  hydrogen: null,
  defaultPowerPlantName: 'SolidCoreFissionReactorVIII',
  shipHullName: 'Battleship',
  shipArmorName: 'AdamantaneArmor',
  shipArmorValues: {
    nose: 1,
    sides: 1,
    tail: 1
  }
})

const driveCount = ref(1)

let data = ref(getDataForOptions(options))

let selectedHullName = ref('Battleship')
const selectedHull = computed(() => shipHullDict[selectedHullName.value])

let selectedArmorName = ref('AdamantaneArmor')
const selectedArmor = computed(() => shipArmorDict[selectedArmorName.value])

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
  return data.value.drivePowerPlantPairings.map((pairing) => {
    const { drives, ...rest } = pairing
    const driveIndex = Math.min(driveCount.value - 1, drives.length - 1)
    return { ...rest, drive: drives[driveIndex] }
  })
})

// Test stuff for calculating ship armor cost
const shipExtremeArmorArea = computed(() => Math.PI * (selectedHull.value.width_m / 2.0) ** 2)

const shipSideArmorArea = computed(() => Math.PI * selectedHull.value.width_m * selectedHull.value.length_m / 2)

const armorThickness = computed(() => {
  const massPerDmgKg = 20 / selectedArmor.value.heatofVaporization_MJkg
  const volumePerDmgM3 = massPerDmgKg / selectedArmor.value.density_kgm3
  return volumePerDmgM3 / 0.005
})

const armorWeightPerUnitNose = computed(() => shipExtremeArmorArea.value * selectedArmor.value.density_kgm3 * armorThickness.value / 1000)
const armorWeightPerUnitSide = computed(() => shipSideArmorArea.value * selectedArmor.value.density_kgm3 * armorThickness.value / 1000)

</script>

<template>
  <h1>Terra Invicta Drive Efficiency Explorer</h1>
  <main>
    <div>
      <D3AccDvChart :data="processedData"/>
    </div>
    <div id="options-sidebar">
      Version: {{ GAME_VERSION }}
      <div id="weight-section">
        <label>Hull
          <select v-model="options.shipHullName">
            <option v-for="[key, hull] of Object.entries(shipHullDict)" :key="key" :value="key">{{ hull.friendlyName }}</option>
          </select>
        </label>
        <div>{{ data.fixedMassValues.hullMass }}t</div>
        <div id="armor-subsection">
          <label>Armor
            <select v-model="options.shipArmorName">
              <option v-for="[key, armor] of Object.entries(shipArmorDict)" :key="key" :value="key">{{ armor.friendlyName }}</option>
            </select>
          </label>
          <div id="armor-values-selector" class="weight-section-item">
            <label>Nose
              <input class="armor-input" type="number" v-model="options.shipArmorValues.nose" min="1"/>
            </label>
            <label>Sides
              <input class="armor-input" type="number" v-model="options.shipArmorValues.sides" min="1"/>
            </label>
            <label>Tail
              <input class="armor-input" type="number" v-model="options.shipArmorValues.tail" min="1"/>
            </label>
          </div>
        </div>
        <div>{{ data.fixedMassValues.armorMass.toFixed(0) }}t</div>
        <label>Fuel tanks
          <input type="number" v-model="options.numFuelTanks" min="1"/>
        </label>
        <div>{{ data.fixedMassValues.fuelMass }}t</div>
        <div>
          <label>Payload
            <input type="number" v-model="options.payload" min="0" step="100"/>
          </label>
        </div>
        <div>

          <strong>{{ (data.fixedMassValues.hullMass + data.fixedMassValues.armorMass + data.fixedMassValues.fuelMass + options.payload).toFixed(0) }}t</strong>
        </div>
      </div>
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
        <select v-model="options.spikerName">
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

#options-sidebar {
  display: flex;
  flex-direction: column;
}

#armor-values-selector {
  display: flex;
  flex-direction: row;
  max-width: 150px;
}

#weight-section {
  display: grid;
  justify-items: center;
  grid-template-columns: 2fr 1fr;
}

#armor-subsection {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.armor-input {
  max-width: 50px
}

.weight-section-item {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

