<template>
  <svg
    id="d3AccDvSvg"
    :width="WIDTH"
    :height="HEIGHT"
    :viewBox="[0, 0, WIDTH, HEIGHT].toString()"
    >
    <g id="d3AccDvG"></g>
  </svg>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import { onMounted, watch } from "vue";

import type { Drive, PowerPlant } from "@/core/main";

///
/// Vue Config
///
// References to the HTML elements to be manipulated

// Vue scaffolding
interface Pairing {
  drive: Drive
  powerPlant: PowerPlant
}
const props = defineProps<{
  data: Pairing[]
}>()

// constants
const WIDTH = 1280
const HEIGHT = 600
const MARGIN_TOP = 25;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 35;
const MARGIN_LEFT = 40;

const START_X = MARGIN_LEFT
const END_X = WIDTH - MARGIN_RIGHT
const START_Y = HEIGHT - MARGIN_BOTTOM
const END_Y = MARGIN_TOP


// Deal with dark mode
const mode =matchMedia("(prefers-color-scheme: dark)")

// Create the scales
const x = d3.scaleLog()
  .domain([0.1, 5 * 1e4])
  .range([START_X, END_X])

const y = d3.scaleLog()
  .domain([0.05, 1e5])
  .range([START_Y, END_Y])

//scale for colors per drive type
const driveTypeColor = d3.scaleOrdinal(d3.schemeSet3)

onMounted(() => {
  // Create the SVG container
  const svg = d3.select('#d3AccDvSvg')
  // Create and append the axes
  svg.append('g')
    .attr('transform', `translate(0,${START_Y})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', `translate(${START_X},0)`)
    .call(d3.axisLeft(y));
  render(props.data)
})



function render(data: Pairing[]) {
  const dataPoints = 
  d3.select('#d3AccDvG')
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', (d) => x(d.drive.selectedOptionValues?.deltaV!))
    .attr('cy', (d) => y(d.drive.selectedOptionValues?.accel!))
    .attr('r', 5)
    .attr('title', (d) => d.drive.dataName!)
    .style('fill', (d) => driveTypeColor(d.drive.driveClassification + d.drive.requiredPowerPlant))


  // Draw labels
  
  d3.select('#d3AccDvG')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('x', (d) => x(d.drive.selectedOptionValues?.deltaV!))
    .attr('y', (d) => y(d.drive.selectedOptionValues?.accel!) + 15)
    .attr('font-size', 10)
    .text((d) => d.drive.friendlyName)
}

// Interactivity
// Using a small trick to make props reactive
watch(() => props.data, (newData) => {
  render(newData)
  console.log(newData)
})

</script>

<style scoped>
svg {
  max-width: 100%;
  height: auto;
}

@media (prefers-color-scheme: dark) {
  svg {
    fill: white;
  }
}

</style>