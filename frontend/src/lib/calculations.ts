// ============================================================
// Engine A — Video Wall Spec
// Ported from linea_led_estimator.html
// Uses MS, DC, CD for cabinet/module lookup
// Uses CT for controller recommendation (650k pixels/port)
// ============================================================

const MPF = 304.8

export const MS = {
  "P1.25": { w: 320, h: 160, rx: 256, ry: 128 },
  "P1.5":  { w: 320, h: 160, rx: 208, ry: 104 },
  "P1.8":  { w: 320, h: 160, rx: 170, ry:  85 },
  "P2":    { w: 320, h: 160, rx: 160, ry:  80 },
  "P2.5":  { w: 320, h: 160, rx: 128, ry:  64 },
  "P3":    { w: 320, h: 160, rx: 104, ry:  52 },
  "P4":    { w: 320, h: 160, rx:  80, ry:  40 },
  "P6":    { w: 192, h: 192, rx:  32, ry:  32 },
  "P10 RGB": { w: 320, h: 160, rx: 32, ry: 16 },
}

export const DC = {
  indoor: [
    {
      l: "640×640 mm (square)",
      w: 640, h: 640,
      p: ["P1.25","P1.5","P1.8","P2","P2.5","P3"],
      r: {
        "P1.25": { x: 256, y: 128 },
        "P1.5":  { x: 208, y: 104 },
        "P1.8":  { x: 170, y:  85 },
        "P2":    { x: 160, y:  80 },
        "P2.5":  { x: 128, y:  64 },
        "P3":    { x: 104, y:  52 },
      },
    },
    {
      l: "640×480 mm (landscape)",
      w: 640, h: 480,
      p: ["P1.25","P1.5","P1.8","P2","P2.5","P3"],
      r: {
        "P1.25": { x: 256, y: 128 },
        "P1.5":  { x: 208, y: 104 },
        "P1.8":  { x: 170, y:  85 },
        "P2":    { x: 160, y:  80 },
        "P2.5":  { x: 128, y:  64 },
        "P3":    { x: 104, y:  52 },
      },
    },
  ],
  outdoor: [
    {
      l: "960×960 mm",
      w: 960, h: 960,
      p: ["P2.5","P3","P4","P6"],
      r: {
        "P2.5": { x: 128, y: 64 },
        "P3":   { x: 104, y: 52 },
        "P4":   { x:  80, y: 40 },
        "P6":   { x:  32, y: 32 },
      },
    },
    {
      l: "640×640 mm",
      w: 640, h: 640,
      p: ["P2.5","P3","P4","P6"],
      r: {
        "P2.5": { x: 128, y: 64 },
        "P3":   { x: 104, y: 52 },
        "P4":   { x:  80, y: 40 },
        "P6":   { x:  32, y: 32 },
      },
    },
  ],
}

export const CD = {
  indoor: {
    "MS Cabinet":       { t: "ms",      p: ["P1.25","P1.5","P1.8","P2","P2.5","P3","P4","P6","P10 RGB"] },
    "Module Installation": { t: "module", p: ["P1.25","P1.5","P1.8","P2","P2.5","P3","P4","P6","P10 RGB"] },
    "Die Cast":         { t: "diecast", p: ["P1.25","P1.5","P1.8","P2","P2.5","P3"] },
  },
  outdoor: {
    "MS Cabinet":       { t: "ms",      p: ["P2.5","P3","P4","P6"] },
    "Module Installation": { t: "module", p: ["P2.5","P3","P4","P6"] },
    "Die Cast":         { t: "diecast", p: ["P2.5","P3","P4","P6"] },
  },
}

export const CT = [
  { ports:  1, model: "HUIDU A3L",    type: "Controller" },
  { ports:  1, model: "HUIDU A4L",    type: "Controller" },
  { ports:  2, model: "HUIDU A5L",    type: "Controller" },
  { ports:  4, model: "HUIDU A6L",    type: "Controller" },
  { ports:  4, model: "HUIDU VP-410", type: "Processor"  },
  { ports:  6, model: "HUIDU H6",     type: "Controller" },
  { ports:  6, model: "HUIDU VP630",  type: "Processor"  },
  { ports:  8, model: "HUIDU H8",     type: "Controller" },
  { ports:  8, model: "HUIDU VP830",  type: "Processor"  },
  { ports: 12, model: "HUIDU VP1240", type: "Processor"  },
  { ports: 16, model: "HUIDU A8",     type: "Controller" },
  { ports: 16, model: "HUIDU VP1640", type: "Processor"  },
]

function snapCalc(rw, rh, sw, sh) {
  const cw = Math.max(1, Math.round(rw * MPF / sw))
  const ch = Math.max(1, Math.round(rh * MPF / sh))
  return {
    cw,
    ch,
    aw: cw * sw,
    ah: ch * sh,
    awf: (cw * sw) / MPF,
    ahf: (ch * sh) / MPF,
  }
}

function getUnit(env, pitch, cab) {
  const t = CD[env][cab].t
  if (t === 'ms' || t === 'module') {
    const m = MS[pitch]
    return { sw: m.w, sh: m.h, rx: m.rx, ry: m.ry, t }
  }
  const dco = DC[env].filter(d => d.p.includes(pitch))
  const dc = dco[0]
  const r = dc.r[pitch] || { x: 0, y: 0 }
  return { sw: dc.w, sh: dc.h, rx: r.x, ry: r.y, t: 'diecast' }
}

export function calculateVideoWallSpec({ environment, pixelPitch, widthFt, heightFt, cabinetType }) {
  const u = getUnit(environment, pixelPitch, cabinetType)
  const s = snapCalc(widthFt, heightFt, u.sw, u.sh)

  const resW = s.cw * u.rx
  const resH = s.ch * u.ry
  const totalPixelCount = resW * resH
  const portsNeeded = Math.max(1, Math.ceil(totalPixelCount / 650000))
  const ctrl = CT.find(c => c.ports >= portsNeeded) || CT[CT.length - 1]

  return {
    actualWidthFt:  parseFloat(s.awf.toFixed(2)),
    actualHeightFt: parseFloat(s.ahf.toFixed(2)),
    totalModules:   s.cw * s.ch,
    resolutionPx:   { width: resW, height: resH },
    totalPixelCount,
    controllerModel: ctrl.model,
    cabinetType:    cabinetType,
  }
}

// ============================================================
// Engine B — GSB Signage Spec
// Ported from GSB Placement chart HTML
// Constants: MODULE_SIZE=1.82, WIRE_SIZE=5.0, MARGIN=3.0,
//            MODULES_PER_SQFT=3, SMPS_LOAD=0.70
// ============================================================

const GSB_MODULE_SIZE    = 1.82
const GSB_WIRE_SIZE      = 5.0
const GSB_MARGIN         = 3.0
const GSB_MODULES_PER_SQFT = 3
const GSB_SMPS_LOAD      = 0.70

export function toInches(val, unit) {
  return unit === 'ft' ? val * 12 : val
}

export function toFeet(val, unit) {
  return unit === 'in' ? val / 12 : val
}

export function calculateGsbSignageSpec({ widthFt, heightFt, widthUnit = 'ft', heightUnit = 'ft' }) {
  const L = toInches(widthFt, widthUnit)
  const H = toInches(heightFt, heightUnit)

  const usableL = L - 2 * GSB_MARGIN
  const usableH = H - 2 * GSB_MARGIN
  const areaSqft = (L * H) / 144

  const pitch = GSB_MODULE_SIZE + GSB_WIRE_SIZE
  const modulesPerRow = Math.max(1, Math.floor(1 + (usableL - GSB_MODULE_SIZE) / pitch))
  const estimatedModules = Math.round(areaSqft * GSB_MODULES_PER_SQFT)
  const numRows = Math.ceil(estimatedModules / modulesPerRow)
  const totalModules = modulesPerRow * numRows
  const totalWattage = totalModules
  const minSmpsWatts = parseFloat((totalWattage / GSB_SMPS_LOAD).toFixed(1))

  return {
    totalModules,
    totalWattage,
    minSmpsWatts,
    modulesPerRow,
    numRows,
  }
}