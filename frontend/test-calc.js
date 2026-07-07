// Manual test runner for calculation engines
// Run: node --experimental-vm-modules test-calc.js  (or just open in browser)
// Or: npx tsx test-calc.js

import { calculateVideoWallSpec, calculateGsbSignageSpec } from './lib/calculations.ts'

function assert(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${pass ? '✅' : '❌'} ${label}`)
  if (!pass) {
    console.log(`   got:      ${JSON.stringify(actual)}`)
    console.log(`   expected: ${JSON.stringify(expected)}`)
  }
}

console.log('\n=== ENGINE A: Video Wall ===\n')

// Test 1: indoor P2.5 Module Installation 8×4.5 ft
const vw1 = calculateVideoWallSpec({
  environment: 'indoor',
  pixelPitch: 'P2.5',
  widthFt: 8,
  heightFt: 4.5,
  cabinetType: 'Module Installation',
})
assert('VW1 actualWidthFt', vw1.actualWidthFt, 8.0)
assert('VW1 actualHeightFt', vw1.actualHeightFt, 4.5)
assert('VW1 totalModules', vw1.totalModules, 72)
assert('VW1 resolutionPx', vw1.resolutionPx, { width: 1024, height: 576 })
assert('VW1 totalPixelCount', vw1.totalPixelCount, 589824)
assert('VW1 controllerModel', vw1.controllerModel, 'HUIDU A4L')
console.log('VW1 full:', vw1)

// Test 2: outdoor P4 Die Cast 10×8 ft
const vw2 = calculateVideoWallSpec({
  environment: 'outdoor',
  pixelPitch: 'P4',
  widthFt: 10,
  heightFt: 8,
  cabinetType: 'Die Cast',
})
assert('VW2 actualWidthFt', vw2.actualWidthFt, 10.0)
assert('VW2 actualHeightFt', vw2.actualHeightFt, 8.0)
assert('VW2 totalModules', vw2.totalModules, 16)
assert('VW2 resolutionPx', vw2.resolutionPx, { width: 320, height: 160 })
assert('VW2 totalPixelCount', vw2.totalPixelCount, 51200)
assert('VW2 controllerModel', vw2.controllerModel, 'HUIDU A4L')
console.log('VW2 full:', vw2)

// Test 3: indoor P1.5 MS Cabinet 6×3 ft → 2-port controller
const vw3 = calculateVideoWallSpec({
  environment: 'indoor',
  pixelPitch: 'P1.5',
  widthFt: 6,
  heightFt: 3,
  cabinetType: 'MS Cabinet',
})
assert('VW3 totalPixelCount', vw3.totalPixelCount, 778752)
assert('VW3 controllerModel', vw3.controllerModel, 'HUIDU A5L') // 2 ports
assert('VW3 totalModules', vw3.totalModules, 36)
console.log('VW3 full:', vw3)

console.log('\n=== ENGINE B: GSB Signage ===\n')

// Test 1: 408in × 36in (matches source file exactly)
const gsb1 = calculateGsbSignageSpec({
  widthFt: 408,
  heightFt: 36,
  widthUnit: 'in',
  heightUnit: 'in',
})
assert('GSB1 totalModules', gsb1.totalModules, 59)
assert('GSB1 totalWattage', gsb1.totalWattage, 59)
assert('GSB1 minSmpsWatts', gsb1.minSmpsWatts, 84.3)
assert('GSB1 modulesPerRow', gsb1.modulesPerRow, 59)
assert('GSB1 numRows', gsb1.numRows, 1)
console.log('GSB1 full:', gsb1)

// Test 2: same as above but using ft units (34×3 ft)
const gsb2 = calculateGsbSignageSpec({
  widthFt: 34,
  heightFt: 3,
  widthUnit: 'ft',
  heightUnit: 'ft',
})
assert('GSB2 totalModules', gsb2.totalModules, 59)
assert('GSB2 totalWattage', gsb2.totalWattage, 59)
assert('GSB2 modulesPerRow', gsb2.modulesPerRow, 59)
console.log('GSB2 full:', gsb2)

// Test 3: smaller board 10×2 ft → multi-row
const gsb3 = calculateGsbSignageSpec({
  widthFt: 10,
  heightFt: 2,
  widthUnit: 'ft',
  heightUnit: 'ft',
})
assert('GSB3 modulesPerRow', gsb3.modulesPerRow, 16)
assert('GSB3 numRows', gsb3.numRows, 4)
assert('GSB3 totalModules', gsb3.totalModules, 64)
assert('GSB3 minSmpsWatts', gsb3.minSmpsWatts, 91.4)
console.log('GSB3 full:', gsb3)

console.log('\n✅ All tests complete — compare output against source HTML files.\n')
