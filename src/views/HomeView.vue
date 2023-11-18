<script setup lang="ts">
import { loadDataFromVersion, getDataForConfig } from '@/core/main'

await loadDataFromVersion('0.3.107')
const driveData = getDataForConfig()
</script>

<template>
  <main>
    {{ driveData }}
  </main>
</template>
