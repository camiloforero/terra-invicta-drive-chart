<template>
  <div id="svgContainer" />
  <svg
    id="d3AccDvSvg"
    :width="WIDTH"
    :height="HEIGHT"
    :viewBox="[0, 0, WIDTH, HEIGHT].toString()"
    >
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

onMounted(() => {
  // Create the scales
  const x = d3.scaleLog()
    .domain([0.1, 5 * 1e4])
    .range([START_X, END_X])

  const y = d3.scaleLog()
    .domain([0.05, 1e5])
    .range([START_Y, END_Y])

  //scale for colors per drive type
  const driveTypeColor = d3.scaleOrdinal(d3.schemeSet3)

  // Create the SVG container
  const svg = d3.select('#d3AccDvSvg')
  // Create and append the axes
  const gx = svg.append('g')
    .attr('transform', `translate(0,${START_Y})`)
    .call(d3.axisBottom(x));

  const gy = svg.append('g')
    .attr('transform', `translate(${START_X},0)`)
    .call(d3.axisLeft(y));

  // Add 4G line
  const lineFourG = svg.append('line')
    .attr('x1', START_X)
    .attr('x2', END_X)
    .attr('y1', y(4000))
    .attr('y2', y(4000))
    .attr('stroke', 'red')

  // Data points
  const gDataPoints = svg.append('g')
    .attr('font-size', 10)
    .style('text-anchor', 'middle')

  
  const zoom = d3.zoom()
    .scaleExtent([0.5, 32])
    .on("zoom", zoomed);
  
  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  renderDataPoints(props.data)


  // Interactivity
  // Using a small trick to make props reactive
  watch(() => props.data, (newData) => {
    renderDataPoints(newData)
    console.log(newData)
  })

  // Function for rendering and re-rendering data points
  function renderDataPoints(data: Pairing[]) {
    gDataPoints
      .selectAll('circle')
      .data(data)
      .join('circle')
      .transition()
      .attr('cx', (d) => x(d.drive.selectedOptionValues?.deltaV!))
      .attr('cy', (d) => y(d.drive.selectedOptionValues?.accel!))
      .attr('r', 5)
      .attr('title', (d) => d.drive.dataName!)
      .style('fill', (d) => driveTypeColor(d.drive.driveClassification + d.drive.requiredPowerPlant))

    // Draw labels
    
    gDataPoints
      .selectAll('text')
      .data(data)
      .join('text')
      .transition()
      .attr('x', (d) => x(d.drive.selectedOptionValues?.deltaV!))
      .attr('y', (d) => y(d.drive.selectedOptionValues?.accel!) + 12)
      .text((d) => d.drive.friendlyName)
  }

  function zoomed({transform}) {
    const zx = transform.rescaleX(x).interpolate(d3.interpolateRound);
    const zy = transform.rescaleY(y).interpolate(d3.interpolateRound);
    gDataPoints
      .attr("transform", transform)
      .attr('font-size', 10 / Math.sqrt(transform.k));
    gDataPoints
      .selectAll('circle')
      .attr('r', 5 / Math.sqrt(transform.k));
    lineFourG.attr("transform", transform) // .attr("stroke-width", 5 / transform.k);
    gx.call(xAxis, zx);
    gy.call(yAxis, zy);
  }
})

const xAxis = (g, x) => g
    .attr("transform", `translate(0,${START_Y})`)
    .call(d3.axisTop(x))

const yAxis = (g, y) => g
  .attr('transform', `translate(${START_X},0)`)
  .call(d3.axisRight(y))

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