// Terrain for Meridian Sortie: a seeded procedural archipelago.
// One height function drives everything the renderer draws: sea, beaches,
// grassy islands, a river valley, a winding canyon, a road, and one flat
// runway strip carved into the coast.
import { fbm, clamp, lerp } from './random.js';
import { WORLD } from './config.js';

// A smooth step from 0 to 1 between two edges.
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export class Terrain {
  constructor(seed) {
    this.seed = seed;
    // The canyon runs roughly north-south, bending east as it goes north.
    this.canyonCentre = (z) => 260 + 90 * Math.sin(z * 0.0011 + 1.7);
    // The river runs south from the mountains toward the sea.
    this.riverCentre = (z) => -180 + 70 * Math.sin(z * 0.0009 + 0.4);
    // The road follows the coast from the runway village northward.
    this.roadCentre = (z) => 120 + 60 * Math.sin(z * 0.0013 + 2.2);
  }

  // Height in metres at world (x, z). Sea level is 0; negative is seabed.
  heightAt(x, z) {
    const s = this.seed;
    const base = fbm(x * WORLD.islandScale, z * WORLD.islandScale, s, 4);
    const ridge = fbm(x * WORLD.mountainScale + 40, z * WORLD.mountainScale, s + 7, 4);
    let h = base * 70 + Math.max(0, ridge) * WORLD.maxHeight * 0.9 - 18;
    // The north is mountain country: height grows with z.
    h += smoothstep(500, 1600, z) * 110;
    // The canyon: a deep cut along its centre line.
    const dc = Math.abs(x - this.canyonCentre(z));
    h -= smoothstep(150, 0, dc) * 70;
    // The river valley: a shallow cut along its centre line.
    const dr = Math.abs(x - this.riverCentre(z));
    h -= smoothstep(110, 0, dr) * 34;
    // The runway apron and its approach corridor are flat ground: a strip
    // along the runway's line, blended in at the edges so the flat land
    // meets the hills instead of cutting through them.
    const corrAcross = Math.abs(x - WORLD.runwayX);
    const corrAlong = z;
    if (corrAlong > 380 && corrAlong < 1150 && corrAcross < 150) {
      const t = smoothstep(150, 70, corrAcross)
        * smoothstep(380, 560, corrAlong)
        * smoothstep(1150, 1030, corrAlong);
      h = lerp(h, 6, t);
    }
    return h;
  }

  // What the ground looks like at (x, z, h): sea, sand, grass, rock, snow.
  groundKind(x, z, h) {
    if (h < 0) return 'sea';
    if (h < 4) return 'sand';
    if (h > 165) return 'snow';
    if (h > 110) return 'rock';
    const dc = Math.abs(x - this.canyonCentre(z));
    if (dc < 60 && h < 60) return 'canyon';
    const dr = Math.abs(x - this.riverCentre(z));
    if (dr < 26 && h < 30) return 'river';
    const droad = Math.abs(x - this.roadCentre(z));
    if (droad < 7 && z > 700 && z < 2200) return 'road';
    if (h < 55) return 'grass';
    return 'meadow';
  }

  // Colour for a ground kind, shaded by height and by slope noise.
  groundColor(kind, x, z, h) {
    const n = fbm(x * 0.02, z * 0.02, this.seed + 31, 2) * 10;
    const shade = (r, g, b) => {
      const f = clamp(1 + n / 130, 0.85, 1.15);
      return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
    };
    switch (kind) {
      case 'sea': {
        const deep = clamp(-h / 40, 0, 1);
        return shade(42 + deep * 6, 118 - deep * 28, 186 - deep * 36);
      }
      case 'sand': return shade(214, 196, 138);
      case 'grass': return shade(86, 148, 74);
      case 'meadow': return shade(104, 160, 82);
      case 'rock': return shade(128, 122, 112);
      case 'snow': return shade(232, 236, 240);
      case 'canyon': return shade(176, 118, 78);
      case 'river': return shade(52, 120, 168);
      case 'road': return shade(96, 92, 88);
      default: return shade(100, 140, 80);
    }
  }
}
