// Missions for Meridian Sortie: sorties, their rings, scoring and stars.
// Rings are laid out along a winding flight path from the runway area out
// across the archipelago, so each sortie reads as one planned route.
import { MISSIONS, RINGS, SCORE, WORLD } from './config.js';
import { makeRng } from './random.js';

export class MissionSet {
  constructor(seed, terrain = null) {
    this.seed = seed;
    this.terrain = terrain;
    this.missionIndex = 0;
    this.rings = [];
    this.buildRings();
  }

  get mission() {
    return MISSIONS[this.missionIndex];
  }

  get done() {
    return this.missionIndex >= MISSIONS.length;
  }

  buildRings() {
    const m = this.mission;
    const rng = makeRng(this.seed * 1000 + m.id * 77);
    this.rings = [];
    // The route wanders: start near the runway, swing out over the islands,
    // then (for the later sorties) climb into the canyon and the ridge.
    let x = WORLD.runwayX + 40;
    let z = WORLD.runwayZ - 260;
    let dir = (rng() - 0.5) * 0.9;
    for (let i = 0; i < m.ringCount; i += 1) {
      dir += (rng() - 0.5) * 0.9;
      dir = Math.max(-1.1, Math.min(1.1, dir));
      const step = m.spread * (0.7 + rng() * 0.6);
      x += Math.sin(dir) * step;
      z += Math.cos(dir) * step;
      x = Math.max(-700, Math.min(700, x));
      const [lo, hi] = m.heightBand;
      let y = lo + rng() * (hi - lo);
      // Never bury a ring in a hillside: keep it clear of the ground.
      if (this.terrain) y = Math.max(y, this.terrain.heightAt(x, z) + 26);
      this.rings.push({
        index: i,
        x,
        z,
        y,
        groundY: 0,
        done: false,
        radius: RINGS.radius,
      });
    }
    // The last ring swings back toward the runway for the landing leg, low
    // over the flat approach corridor.
    const last = this.rings[this.rings.length - 1];
    last.x = WORLD.runwayX + 30;
    last.z = WORLD.runwayZ - WORLD.runwayLength;
    last.y = 45;
  }

  nextRing() {
    return this.rings.find((r) => !r.done) || null;
  }

  // True when the plane just flew through the next ring.
  checkRing(plane) {
    const ring = this.nextRing();
    if (!ring) return null;
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    const dz = plane.z - ring.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < ring.radius) {
      ring.done = true;
      plane.ringsPassed += 1;
      return ring;
    }
    return null;
  }

  allRingsDone() {
    return this.rings.every((r) => r.done);
  }

  // Stars for a finished sortie: ring bonus plus time and landing quality.
  starsFor(score, elapsed, landing) {
    const [one, two, three] = SCORE.star;
    let s = score;
    if (landing && landing.smooth) s += SCORE.landingSmooth;
    if (landing && landing.centre) s += SCORE.landingCentre;
    if (elapsed < 240) s += Math.round((240 - elapsed) * SCORE.timeBonusPerSecond);
    if (s >= three) return 3;
    if (s >= two) return 2;
    if (s >= one) return 1;
    return 0;
  }

  advance() {
    this.missionIndex += 1;
    if (!this.done) this.buildRings();
  }
}
