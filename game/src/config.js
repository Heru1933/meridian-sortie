// Meridian Sortie — tuning constants for the whole game.
// One place for every number a designer would want to tweak: speeds, fuel,
// damage, ring sizes, mission shapes and the look of the sky.
export const VIEW = { width: 1280, height: 800 };

export const PLANE = {
  minSpeed: 28,
  maxSpeed: 120,
  cruiseSpeed: 62,
  climbRate: 9,
  sinkRate: 7,
  turnRate: 0.55,
  rollRate: 1.9,
  maxRoll: 0.9,
  fuelCapacity: 100,
  fuelBurn: 0.55,
  fuelBurnThrottle: 0.9,
  maxDamage: 3,
  wingspan: 26,
};

export const WORLD = {
  seaLevel: 0,
  islandScale: 0.0045,
  mountainScale: 0.0016,
  maxHeight: 210,
  runwayX: 0,
  runwayZ: 900,
  runwayHeading: 0,
  runwayLength: 260,
  runwayWidth: 26,
};

export const RINGS = { radius: 16, passBonus: 250, nearBonus: 60 };

export const MISSIONS = [
  {
    id: 1,
    name: 'Island Hop',
    brief: 'Six rings over the coast and the outer islands. Calm air — learn the throttle.',
    ringCount: 6,
    wind: 0,
    fuel: 100,
    timeOfDay: 'morning',
    spread: 420,
    heightBand: [55, 110],
  },
  {
    id: 2,
    name: 'Canyon Run',
    brief: 'Eight rings threaded through the canyon. Gusts push you sideways — fly the line.',
    ringCount: 8,
    wind: 9,
    fuel: 100,
    timeOfDay: 'noon',
    spread: 520,
    heightBand: [45, 95],
  },
  {
    id: 3,
    name: 'Storm Ridge',
    brief: 'Ten rings over the high ridge at dusk, in rain. Fuel is tight — every ring counts.',
    ringCount: 10,
    wind: 14,
    fuel: 80,
    timeOfDay: 'dusk',
    spread: 640,
    heightBand: [90, 170],
  },
];

export const UPGRADES = [
  { id: 'tank', name: 'Drop Tank', cost: 400, desc: '+30 max fuel' },
  { id: 'engine', name: 'Tuned Engine', cost: 500, desc: '+12 top speed, faster climb' },
  { id: 'handling', name: 'Lightened Controls', cost: 350, desc: '+25% turn and roll rate' },
];

export const SKY = {
  morning: { top: '#2f6fb4', mid: '#7fb2dd', low: '#cfe6f2', sun: '#fff3c4', fog: 'rgba(207,230,242,0.55)' },
  noon: { top: '#1f5fa8', mid: '#5ea3d8', low: '#bfe0ef', sun: '#ffffff', fog: 'rgba(191,224,239,0.5)' },
  dusk: { top: '#2b2a55', mid: '#b25a6e', low: '#f2a35e', sun: '#ffb347', fog: 'rgba(242,163,94,0.5)' },
};

export const SCORE = { ring: 250, timeBonusPerSecond: 8, landingSmooth: 300, landingCentre: 200, star: [900, 1500, 2100] };
