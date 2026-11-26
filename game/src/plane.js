// The aircraft: flight model and state for Meridian Sortie.
// A light prop plane with throttle, pitch, roll, speed, fuel and damage.
// The model is deliberately forgiving — a game, not a simulator — but it
// punishes the two classic mistakes: flying too slow, and flying into rock.
import { PLANE, WORLD } from './config.js';
import { clamp } from './random.js';

export const STATE = { TITLE: 'title', FLYING: 'flying', PAUSED: 'paused', UPGRADE: 'upgrade', LANDED: 'landed', CRASHED: 'crashed', VICTORY: 'victory' };

export class Plane {
  constructor() {
    this.reset(1, 100);
  }

  reset(missionId, fuel) {
    // On final approach over the flat corridor, just south of the runway,
    // climbing out over the threshold toward the first ring.
    this.x = WORLD.runwayX;
    this.z = WORLD.runwayZ - WORLD.runwayLength - 80;
    this.y = 25;
    this.heading = 0;
    this.pitch = 0;
    this.roll = 0;
    this.speed = PLANE.cruiseSpeed;
    this.throttle = 0.62;
    this.fuel = fuel;
    this.damage = 0;
    this.missionId = missionId;
    this.ringsPassed = 0;
    this.score = 0;
    this.elapsed = 0;
    this.verticalSpeed = 0;
    this.gust = 0;
    this.warnLowFuel = false;
    this.warnTerrain = false;
    this.landedSmooth = 0;
    this.landedCentre = 0;
  }

  // upgrades: { tank, engine, handling } — booleans bought between sorties.
  maxFuel(upgrades) {
    return PLANE.fuelCapacity + (upgrades.tank ? 30 : 0);
  }

  maxSpeed(upgrades) {
    return PLANE.maxSpeed + (upgrades.engine ? 12 : 0);
  }

  // One physics step. input: { pitch, roll, throttleDelta, brake, wind }.
  // dt in seconds. terrain is a Terrain used for ground collision.
  step(dt, input, terrain, upgrades) {
    this.elapsed += dt;
    const handling = upgrades.handling ? 1.25 : 1;
    const topSpeed = this.maxSpeed(upgrades);
    // Roll toward the commanded roll, then turn from the roll.
    const targetRoll = clamp(input.roll, -1, 1) * PLANE.maxRoll;
    this.roll += clamp(targetRoll - this.roll, -PLANE.rollRate * handling * dt, PLANE.rollRate * handling * dt);
    // Banking right turns the nose right (heading grows); banking left the reverse.
    this.heading += this.roll * PLANE.turnRate * handling * dt * (0.6 + this.speed / topSpeed);
    // Pitch: pull up climbs, push down dives; pitch bleeds speed when steep.
    const targetPitch = clamp(input.pitch, -1, 1) * 0.42;
    this.pitch += clamp(targetPitch - this.pitch, -1.4 * dt, 1.4 * dt);
    // Throttle and speed.
    this.throttle = clamp(this.throttle + input.throttleDelta * dt, 0, 1);
    const targetSpeed = PLANE.minSpeed + this.throttle * (topSpeed - PLANE.minSpeed);
    let accel = (targetSpeed - this.speed) * 0.35;
    if (input.brake) accel -= 22 * dt * 3;
    accel -= Math.sin(this.pitch) * 14;
    this.speed = clamp(this.speed + accel * dt, 18, topSpeed + 8);
    if (input.brake) this.speed = Math.max(PLANE.minSpeed * 0.7, this.speed - 26 * dt);
    // Wind gusts push the nose sideways a little.
    this.gust = input.wind * Math.sin(this.elapsed * 0.9 + this.x * 0.01) * 0.35;
    // Move forward along the heading.
    const vx = Math.sin(this.heading) * this.speed + this.gust;
    const vz = Math.cos(this.heading) * this.speed;
    this.x += vx * dt;
    this.z += vz * dt;
    this.verticalSpeed = Math.sin(this.pitch) * this.speed * 0.55 - (this.speed < 34 ? (34 - this.speed) * 0.35 : 0);
    this.y += this.verticalSpeed * dt;
    if (this.y < 2) this.y = 2;
    // Fuel burns with throttle; empty tanks mean a dead stick.
    const burn = (PLANE.fuelBurn + this.throttle * PLANE.fuelBurnThrottle) * dt;
    this.fuel = Math.max(0, this.fuel - burn);
    if (this.fuel <= 0) this.throttle = Math.max(this.throttle - dt, 0);
    this.warnLowFuel = this.fuel < 18;
    // Terrain proximity warning and collision.
    const ground = terrain.heightAt(this.x, this.z);
    this.warnTerrain = this.y - ground < 18;
    if (this.y <= ground + 1.5) {
      return 'terrain';
    }
    return null;
  }

  // Called when the plane hits terrain. Returns true when that ends the run.
  takeHit() {
    this.damage += 1;
    this.y += 26;
    this.speed = Math.max(PLANE.minSpeed, this.speed * 0.6);
    this.pitch = 0.18;
    return this.damage >= PLANE.maxDamage;
  }

  // Landing quality: called on touchdown. Returns a report for scoring.
  touchdown(terrain) {
    const ground = terrain.heightAt(this.x, this.z);
    const nearRunway = Math.abs(this.x - WORLD.runwayX) < WORLD.runwayWidth * 2.2
      && Math.abs(this.z - WORLD.runwayZ) < WORLD.runwayLength * 0.7;
    if (!nearRunway) return null;
    const smooth = this.verticalSpeed > -6 && this.speed < 78;
    const centre = Math.abs(this.x - WORLD.runwayX) < WORLD.runwayWidth * 0.6;
    const vertical = Math.abs(this.verticalSpeed);
    this.landedSmooth = smooth ? 1 : 0;
    this.landedCentre = centre ? 1 : 0;
    return { smooth, centre, vertical, ground, y: this.y };
  }
}
