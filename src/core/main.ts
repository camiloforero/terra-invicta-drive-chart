import { groupBy, keyBy } from 'lodash-es'

// TypeScript stuff. Useful for IDE autocomplete and to check things here instead of the raw JSON files
interface MaterialCostSet {
  metals?: number
  volatiles?: number
}

interface Component {
  dataName: string
  friendlyName: string
  requiredProjectName: string // Not all components have this, but enough do
}

export interface Drive extends Component {
  dataName: string
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

export interface PowerPlant extends Component {
  powerPlantClass: string
  efficiency: number
  specificPower_tGW: number
}

interface ShipHull extends Component {
  mass_tons: number
  alien: boolean
}

interface UtilityModule extends Component {
  thrustMultiplier: number
  EVMultiplier: number
  requiresNuclearDrive: boolean | null
  requiresFusionDrive: boolean | null
}

export interface DrivesPowerPlantPairing {
  drives: Drive[]
  powerPlant: PowerPlant
}
export interface DrivePowerPlantPairing {
  drive: Drive
  powerPlant: PowerPlant
}

interface Radiator extends Component {
  specificPower_2s_KWkg: number
  crew: number
  radiatorType: string
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
  payload: number
  radiatorName: string
  numFuelTanks: number
  defaultPowerPlantName: string
  hydrogen: string | null
  spikerName: string | null
}

// Raw imported JSON data for a game version. Keep it in-memory so later recalculations are more efficient
let rawDriveData: Drive[]
let rawPowerPlantData: PowerPlant[]
let rawRadiatorData: Radiator[]
let rawUtilityModuleData: UtilityModule[]
let rawShipHullData: ShipHull[]

// Preprocessed data
// Drives that have a "best" power plant, selectable in the preprocessing step
let processedDrivePowerPlantData: DrivesPowerPlantPairing[]
// Drives that can be paired with any power plant, which must be specified by the user
let reactorlessDriveData: DrivesPowerPlantPairing[]
let processedReactorlessDrives: DrivesPowerPlantPairing[]
// Best power plants per type
let bestPowerPlants: BestPowerPlantsDict

// Components
export let radiatorDict: {[key: string]: Radiator}
export let shipHullDict: {[key: string]: ShipHull}
export let hydrogenModuleDict: {[key: string]: UtilityModule}
export let spikerDict: {[key: string]: UtilityModule}
// Hydrogen components


// Partially processed data for relevant drive/power plant pairings.
// As much as can be done without accounting for radiators and modules

//
// Core exportable functions
//

// Import the raw data for the wanted version from the game's JSON files
export async function loadDataFromVersion(version: string) {
  [rawDriveData, rawPowerPlantData, rawRadiatorData, rawUtilityModuleData, rawShipHullData] = await Promise.all([
    (await fetch(`/versions/${version}/TIDriveTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIPowerPlantTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIRadiatorTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIUtilityModuleTemplate.json`)).json(),
    (await fetch(`/versions/${version}/TIShipHullTemplate.json`)).json(),
  ])

  // Preprocess that data as much as feasible
  preprocess()
}

// Return calculated data for a given set of options
export function getDataForOptions({ payload, radiatorName, numFuelTanks, defaultPowerPlantName, hydrogen, spikerName }: OptionsObject) {
  // First use the provided default power plant to process the drives that don't require an specific one
  const defaultPowerPlant = findByDataName(rawPowerPlantData, defaultPowerPlantName)!

  processedReactorlessDrives = reactorlessDriveData.map((pairing) => {
    pairing.drives = deriveValuesInDrivesForPowerPlant(pairing.drives, defaultPowerPlant) as Drive[]
    return pairing
  })

  const radiator = radiatorDict[radiatorName]
  const tonsPerWasteHeat = 1e3 / radiator.specificPower_2s_KWkg
  return [...processedDrivePowerPlantData, ...processedReactorlessDrives].map((pairing) => {
    const drives = pairing.drives.map((drive) => {
      if (drive.powerPlantValues == null) return drive
      
      const radiatorMass = drive.powerPlantValues!.wasteHeat * tonsPerWasteHeat * (1/1e9)
      const dryMass = drive.totalMass! + drive.powerPlantValues!.powerPlantMass + radiatorMass + payload
      const fuelMass = numFuelTanks * 100
      const wetMass = dryMass + fuelMass

      // TODO: extra calculations for the different kinds of hydrogen storage and spikers
      // The goods!
      const hydrogenMultiplier = (hydrogen && drive.propellant == "Hydrogen") ? hydrogenModuleDict[hydrogen].EVMultiplier : 1
      const deltaV = hydrogenMultiplier * drive.EV_kps * Math.log(wetMass/dryMass)

      const spiker = spikerName && spikerDict[spikerName]
      const spikerMultiplier = (spiker && isCompatibleWithSpiker(drive, spiker)) ? spiker.thrustMultiplier : 1
      const accel = spikerMultiplier * (drive.thrust_N * drive.thrustCap / wetMass) / 9.81
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

  // Turn component arrays into hashes
  // Alien radiator types are recognized by their radiatorType property
  radiatorDict = keyBy(rawRadiatorData.filter((r) => r.requiredProjectName != "Project_AlienMasterProject"), 'dataName')
  // Alien hulls are recognized by their alien property
  shipHullDict = keyBy(rawShipHullData.filter((r) => !r.alien), 'dataName')
  
  // From the utility modules list, get the hydrogen containers and the spikers
  const groupedUtilityModules = groupBy(rawUtilityModuleData, 'grouping')
  hydrogenModuleDict = keyBy(groupedUtilityModules[4].filter((r) => r.requiredProjectName != "Project_AlienMasterProject"), 'dataName')
  spikerDict = keyBy(groupedUtilityModules[3].filter((r) => r.requiredProjectName != "Project_AlienMasterProject"), 'dataName')

  // Pair every reactor group with its best drive
  const drivesWithReactor = <DrivesPowerPlantPairing[]>[]
  const drivesWithoutReactor = <DrivesPowerPlantPairing[]>[]
  Object.entries(normalizedDrives).forEach(([_, drives]) => {
    const powerPlant = bestPowerPlants[drives[0].requiredPowerPlant]
    if (powerPlant) {
      drivesWithReactor.push({
        drives: deriveValuesInDrivesForPowerPlant(drives, powerPlant) as Drive[],
        powerPlant,
      })
    }
    else {
      drivesWithoutReactor.push({ drives, powerPlant })
    }
  })
  processedDrivePowerPlantData = drivesWithReactor
  reactorlessDriveData = drivesWithoutReactor
}

function filterBestPowerPlants(rawPowerPlantData: PowerPlant[]) {
  // From the whole list of power plants, select the best ones.
  // I'm using efficiency to determine the best one, but it could also be the max output
  // Generally plants increase in efficiency as they increase with power output.
  // One exception is Gas Core III to Terawatt Gas Core I, but...
  // ... Terawatt Gas Core II is still better than both of them, so it doesn't matter.
  // TODO: do the thing where I pair early gas core drives with vanilla Gas Core reactor
  return rawPowerPlantData.reduce((acc, powerPlant) => {
    const { powerPlantClass } = powerPlant
    const currentBestPP = acc[powerPlantClass]
    if (
      currentBestPP == null ||
      (currentBestPP && currentBestPP.efficiency < powerPlant.efficiency)
    ) {
      acc[powerPlantClass] = powerPlant
    }
    return acc
  }, <BestPowerPlantsDict>{})
}

// Use Sarah's formulae to get derived values
function deriveValuesInDrivesForPowerPlant(drives: Drive[], powerPlant: PowerPlant) {
  console.log(powerPlant)
  return drives.map((drive) => {
    // Sets processed drive values inside the drive object
    const power = (0.5 * drive.thrust_N * 1000 * drive.EV_kps)
    const totalMass =
      drive.flatMass_tons + // The mass of the drive itself
      power * drive.specificPower_kgMW * (1/1e6) * (1/1e3) // Some drives use this calculation instead

    drive.power = power
    drive.totalMass = totalMass

    // Sets processed values from the interaction between a drive and the current power plant
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

    return { ...drive, powerPlantValues: {
      powerPlantMass,
      wasteHeat,
    }  }
  })
}

function findByDataName<T extends Component>(componentArray: T[], dataName: string) {
  return componentArray.find((c) => c.dataName == dataName)
}

function isCompatibleWithSpiker(drive: Drive, spiker: UtilityModule) {
  const FUSION_DRIVES = ['Fusion_Thermal']
  const NUCLEAR_DRIVES = ['Fission_Thermal', 'Fusion_Thermal']
  return (
    (spiker.requiresNuclearDrive && NUCLEAR_DRIVES.includes(drive.driveClassification)) ||
    (spiker.requiresFusionDrive && FUSION_DRIVES.includes(drive.driveClassification))
  )
}