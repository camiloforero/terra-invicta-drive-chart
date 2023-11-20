import { groupBy, keyBy } from 'lodash-es'

// TypeScript stuff. Useful for IDE autocomplete and to check things here instead of the raw JSON files
interface MaterialCostSet {
  metals?: number
  volatiles?: number
}

interface Drive {
  dataName: string
  friendlyName: string
  driveClassification: string
  thrust_N: number
  EV_kps: number
  specificPower_kgMW: number
  efficiency: number
  flatMass_tons: number
  requiredPowerPlant: string
  thrustCap: number
  cooling: string
  weightedBuildMaterials: MaterialCostSet
  propellant: string
  perTankPropellantMaterials: MaterialCostSet
  iconResource: string

  power?: number
  totalMass?: number
  powerPlantValues?: DerivedDrivePowerPlantValues
  selectedOptionValues?: DerivedOptionsValues
}

interface PowerPlant {
  powerPlantClass: string
  efficiency: number
  specificPower_tGW: number
}

export interface DrivePowerPlantPairing {
  drives: Drive[]
  powerPlant: PowerPlant
}

interface Radiator {
  dataName: string
  friendlyName: string
  specificPower_2s_KWkg: number
  crew: number
}

interface DerivedDrivePowerPlantValues {
  powerPlantMass: number
  wasteHeat: number
}
interface DerivedOptionsValues {
  radiatorMass: number
  dryMass: number
  fuelMass: number
  wetMass: number
  deltaV: number
  accel: number
}

interface BestPowerPlantsDict {
  [key: string]: PowerPlant
}

interface OptionsObject {
  payload?: number
  radiatorName?: string
  numFuelTanks?: number
  hydrogen?: string
  spiker?: string
}

// Raw imported JSON data for a game version. Keep it in-memory so later recalculations are more efficient
let rawDriveData: Drive[]
let rawPowerPlantData: PowerPlant[]
let rawRadiatorData: Radiator[]

// Preprocessed data
let processedDrivePowerPlantData: DrivePowerPlantPairing[]
let bestPowerPlants: BestPowerPlantsDict
let radiatorDict: {[key: string]: Radiator}
// Partially processed data for relevant drive/power plant pairings.
// As much as can be done without accounting for radiators and modules

//
// Core exportable functions
//

// Import the raw data for the wanted version from the game's JSON files
export async function loadDataFromVersion(version: string) {
  [rawDriveData, rawPowerPlantData, rawRadiatorData] = await Promise.all([
    (await fetch(`/versions/${version}/TIDriveTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIPowerPlantTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIRadiatorTemplate.json`)).json(),
  ])

  // Preprocess that data as much as feasible
  preprocess()
}

// Return calculated data for a given set of options
export function getDataForOptions({ payload = 2000, radiatorName = "TinDroplet", numFuelTanks = 10, hydrogen, spiker }: OptionsObject = {}) {
  const radiator = radiatorDict[radiatorName]
  const tonsPerWasteHeat = 1e3 / radiator.specificPower_2s_KWkg
  return processedDrivePowerPlantData.map((pairing) => {
    const drives = pairing.drives.map((drive) => {
      if (drive.powerPlantValues == null) return drive
      
      const radiatorMass = drive.powerPlantValues!.wasteHeat * tonsPerWasteHeat * (1/1e9)
      const dryMass = drive.totalMass! + drive.powerPlantValues!.powerPlantMass + radiatorMass + payload
      const fuelMass = numFuelTanks * 100
      const wetMass = dryMass + fuelMass

      // TODO: extra calculations for the different kinds of hydrogen storage and spikers
      // The goods!
      const deltaV = drive.EV_kps * Math.log(wetMass/dryMass)
      const accel = (drive.thrust_N * drive.thrustCap / wetMass) / 9.81
      return {
        ...drive,
        selectedOptionValues: {
          radiatorMass,
          dryMass,
          fuelMass,
          wetMass,
          deltaV,
          accel,
        }
      }
    })
    return { ...pairing, drives }
  })
}


//
// Helper functions
//
function preprocess() {
  bestPowerPlants = filterBestPowerPlants(rawPowerPlantData);
  // Removes the last two characters of each drive (the multiplier) and groups them by the raw value
  const normalizedDrives = groupBy(rawDriveData, (drive) => drive.dataName.slice(0, -2))

  // Turn radiator array into hash
  radiatorDict = keyBy(rawRadiatorData, 'dataName')

  // Pair every reactor group with its best drive
  processedDrivePowerPlantData = Object.entries(normalizedDrives).map(([_, drives]) => {
    const powerPlant = bestPowerPlants[drives[0].requiredPowerPlant]
    drives.forEach((drive) => setDerivedValuesInDriveForPowerPlant(drive, powerPlant))
    return {
      drives,
      powerPlant,
    }
  })
}

function filterBestPowerPlants(rawPowerPlantData: PowerPlant[]) {
  // From the whole list of power plants, select the best ones.
  // I'm using efficiency to determine the best one, but it could also be the max output
  // Generally plants increase in efficiency as they increase with power output.
  // One exception is Gas Core III to Terawatt Gas Core I, but...
  // ... Terawatt Gas Core II is still better than both of them, so it doesn't matter.
  // TODO: do the thing where I pair early gas core drives with vanilla Gas Core reactor
  const bestPowerPlants = <BestPowerPlantsDict>{}
  rawPowerPlantData.forEach((powerPlant) => {
    const { powerPlantClass } = powerPlant
    const currentBestPP = bestPowerPlants[powerPlantClass]
    if (
      currentBestPP == null ||
      (currentBestPP && currentBestPP.efficiency < powerPlant.efficiency)
    ) {
      bestPowerPlants[powerPlantClass] = powerPlant
    }
  })
  return bestPowerPlants
}

// Use Sarah's formulae to get derived values
function setDerivedValuesInDriveForPowerPlant(drive: Drive, powerPlant: PowerPlant) {
  // Sets processed drive values inside the drive object
  const power = (0.5 * drive.thrust_N * 1000 * drive.EV_kps)
  const totalMass =
    drive.flatMass_tons + // The mass of the drive itself
    power * drive.specificPower_kgMW * (1/1e6) * (1/1e3) // Some drives use this calculation instead

  drive.power = power
  drive.totalMass = totalMass

  // Sets processed values from the interaction between a drive and the current power plant
  if (powerPlant == null) return

  let powerPlantMass = 0
  if(!['Chemical', 'Fission_Pulse'].includes(drive.driveClassification)) {
    powerPlantMass += power * powerPlant.specificPower_tGW * (1/1e9)
  }

  let wasteHeat = 0
  
  if(['Closed', 'Calc'].includes(drive.cooling)) {
    wasteHeat += power * (1 - powerPlant.efficiency)
  }
  else if(drive.cooling == 'Open') {
    // No waste heat
  } else throw new Error(`Unsupported cooling type ${drive.cooling}`)

  drive.powerPlantValues = {
    powerPlantMass,
    wasteHeat,
  }
}