<script setup lang="ts">
import * as d3 from "d3";
import { ref, reactive, watch, onMounted } from "vue"

import { loadDataFromVersion, getDataForOptions } from '@/core/main'

await loadDataFromVersion('0.3.107')

// Options that affect the final calculation
const options = reactive({
  numFuelTanks: 10,
  payload: 2000
})

let driveData = getDataForOptions(options)

// Interactivity
watch(options, (newOptions) => {
  console.log(newOptions)
  update(getDataForOptions(options))
})



// D3 stuff
const width = 800
const height = 600
const marginTop = 25;
const marginRight = 20;
const marginBottom = 35;
const marginLeft = 40;

// Reference to the G HTML element to be manipulated
const g = ref(null)


// Create the scales
const x = d3.scaleLog()
  .domain([1, 1e4])
  .range([marginLeft, width - marginRight])

const y = d3.scaleLog()
  .domain([0.5, 1e5])
  .range([height - marginBottom, marginTop])

//scale for colors per drive type
const driveTypeColor = d3.scaleOrdinal()
  .domain([])
  .range(d3.schemeSet3)

onMounted(() => {
  // Create the SVG container
  const svg = d3.select('svg')
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");
  
  // Create and append the axes
  svg.append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));
  update(driveData)
})

function update(data) {
  d3.select(g.value)
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', (d) => x(d.drives[0].selectedOptionValues?.deltaV))
    .attr('cy', (d) => y(d.drives[0].selectedOptionValues?.accel))
    .attr('r', 5)
    .attr('title', (d) => d.drives[0].dataName)
    .style('fill', (d) => driveTypeColor(d.powerPlant?.powerPlantClass))
}


</script>

<template>
  <main>
    <label>Fuel tanks
      <input type="number" v-model="options.numFuelTanks"/>
    </label>
    <label>Payload
      <input type="number" v-model="options.payload"/>
    </label>
    <svg>
      <g ref="g"></g>
    </svg>
  </main>
</template>
