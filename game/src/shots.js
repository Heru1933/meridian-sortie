// Screenshot scenes for Meridian Sortie, behind ?shot=title|chase|rings|landing.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot (turn toward the next ring,
// climb or dive toward its height, hold a cruise throttle), so the frame is
// what a short game really looks like and the same seed always gives the
// same frame.
import { STATE } from './plane.js';
import { WORLD } from './config.js';
import { clamp } from './random.js';

const SAMPLE = 1 / 60;
const TITLE_SECONDS = 6;
const CHASE_SECONDS = 14;
const RINGS_SECONDS = 30;
const LANDING_SECONDS = 12;

/** Steer the plane toward a target point: roll gently to the heading error,
 * pitch to the height error, hold a cruise throttle. The roll is capped so
 * the plane banks like a tourer, not a fighter, and the climb is softened
 * while the nose is still swinging onto the heading. */
function autopilotTo(game, tx, ty, tz, throttle) {
  const p = game.plane;
  const dx = tx - p.x;
  const dz = tz - p.z;
  const dist = Math.hypot(dx, ty - p.y, dz);
  const wantHeading = Math.atan2(dx, dz);
  let err = wantHeading - p.heading;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  // Bank hard when the heading error is large, and slow down near the
  // target: a slow plane turns in a far tighter circle, so the autopilot
  // can actually thread a ring instead of orbiting it.
  const roll = clamp(err * 1.0, -0.7, 0.7);
  const dy = ty - p.y;
  const turnFactor = Math.abs(err) > 0.6 ? 0.6 : 1;
  // Pitch chases a target climb rate (proportional to the height error), so
  // the plane settles onto the ring's height instead of porpoising past it.
  const wantVs = clamp(dy * 0.8, -16, 16);
  const pitch = clamp((wantVs - p.verticalSpeed) * 0.08, -0.5, 0.5) * turnFactor;
  const cruise = dist < 250 ? Math.min(throttle, 0.35) : throttle;
  return { pitch, roll, throttleDelta: clamp((cruise - p.throttle) * 2, -1, 1), brake: false, wind: game.mission.wind };
}

function stepGame(game, input, steps) {
  for (let i = 0; i < steps; i += 1) {
    game.plane.step(SAMPLE, input, game.terrain, game.upgrades);
    const ring = game.missions.checkRing(game.plane);
    if (ring) game.plane.score += 250;
  }
}

function flyTowardRings(game, seconds) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const next = game.missions.nextRing();
    if (!next) break;
    const input = autopilotTo(game, next.x, next.y, next.z, 0.68);
    game.plane.step(SAMPLE, input, game.terrain, game.upgrades);
    const ring = game.missions.checkRing(game.plane);
    if (ring) {
      game.plane.score += 250;
      game.score = game.plane.score;
    }
    if (game.plane.y <= game.terrain.heightAt(game.plane.x, game.plane.z) + 1.5) {
      game.plane.y = game.terrain.heightAt(game.plane.x, game.plane.z) + 30;
    }
  }
}

/**
 * Set `game` to the named scene (title, chase, rings or landing; any other
 * name is title) and return the screen state to draw over it.
 */
export function stageShot(name, game) {
  game.state = STATE.FLYING;
  game.startSortie();
  game.hold = true;
  if (name === 'title') {
    // Level cruise over the coast with the title card on top.
    flyTowardRings(game, TITLE_SECONDS);
    game.state = STATE.TITLE;
    return STATE.TITLE;
  }
  if (name === 'chase') {
    flyTowardRings(game, CHASE_SECONDS);
    return STATE.FLYING;
  }
  if (name === 'rings') {
    flyTowardRings(game, RINGS_SECONDS);
    return STATE.FLYING;
  }
  if (name === 'landing') {
    // Final approach: place the plane on the runway centreline, low and slow,
    // then let the autopilot carry it down the last stretch, stopping while
    // the runway still stretches ahead of the nose.
    const p = game.plane;
    p.x = WORLD.runwayX + 8;
    p.z = WORLD.runwayZ - 340;
    p.y = 38;
    p.heading = 0;
    p.pitch = -0.08;
    p.roll = 0;
    p.speed = 55;
    p.throttle = 0.4;
    game.missions.rings.forEach((r) => { r.done = true; });
    p.ringsPassed = game.missions.rings.length;
    const steps = Math.round(LANDING_SECONDS / SAMPLE);
    for (let i = 0; i < steps; i += 1) {
      const input = autopilotTo(game, WORLD.runwayX, 8, WORLD.runwayZ + 40, 0.38);
      input.pitch = clamp(input.pitch - 0.1, -1, 0.4);
      game.plane.step(SAMPLE, input, game.terrain, game.upgrades);
      if (game.plane.z >= WORLD.runwayZ - 60 || game.plane.y <= 14) break;
    }
    return STATE.FLYING;
  }
  flyTowardRings(game, TITLE_SECONDS);
  game.state = STATE.TITLE;
  return STATE.TITLE;
}
