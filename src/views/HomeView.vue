<script setup lang="ts">
import * as d3 from "d3";
import { reactive, onMounted } from "vue"

import { loadDataFromVersion, getDataForOptions } from '@/core/main'

// Options that affect the final calculation
const options = reactive({
  numFuelTanks: 10,
  payload: 2000
})

await loadDataFromVersion('0.3.107')
const driveData = getDataForOptions(options)





// D3 constants
const width = 800
const height = 600
const marginTop = 25;
const marginRight = 20;
const marginBottom = 35;
const marginLeft = 40;

onMounted(() => {
  // Create the SVG container
  const svg = d3.select('svg')
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  const g = svg.append("g")

  // Create the scales
  const x = d3.scaleLog()
    .domain([2, 1e4])
    .range([marginLeft, width - marginRight])

  const y = d3.scaleLog()
    .domain([0.5, 1e5])
    .range([height - marginBottom, marginTop])
  
  //scale for colors per drive type
  const driveTypeColor = d3.scaleOrdinal()
    .domain([])
    .range(d3.schemeSet3)
  
  // Create and append the axes
  const xAxis = d3.axisBottom(x)
  const yAxis = d3.axisLeft(y)

  svg.append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

  g
    .selectAll('circle')
    .data(driveData)
    .join('circle')
    .attr('cx', (d) => x(d.drives[0].selectedOptionValues?.deltaV))
    .attr('cy', (d) => y(d.drives[0].selectedOptionValues?.accel))
    .attr('r', 5)
    .attr('title', (d) => d.drives[0].dataName)
    .style('fill', (d) => driveTypeColor(d.powerPlant?.powerPlantClass))
})


</script>

<template>
  <main>
    <label>Fuel tanks
    <input type="number" v-model="options.numFuelTanks"/>
    </label>
    <svg></svg>
  </main>
</template>
