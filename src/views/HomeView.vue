<script setup lang="ts">
import { loadDataFromVersion, getDataForOptions } from '@/core/main'

await loadDataFromVersion('0.3.107')
const driveData = getDataForOptions({})
</script>

<template>
  <main>
    {{ driveData }}
  </main>
</template>
