// Main loop and input for Meridian Sortie.
// Owns the game state machine (title → flying → upgrade → landed → victory
// or crashed), keyboard and mouse input, the frame loop, and the wiring
// between the plane, the terrain, the missions, the renderer and the sound.
import { VIEW, MISSIONS, WORLD, SCORE, UPGRADES } from './config.js';
import { makeRng, clamp } from './random.js';
import { Terrain } from './terrain.js';
import { Plane, STATE } from './plane.js';
import { MissionSet } from './missions.js';
import { drawWorld, drawPlane } from './render.js';
import {
  drawHud, drawTitle, drawPaused, drawUpgrade, drawLanded,
  drawCrashed, drawVictory, drawVignette,
} from './instruments.js';
import { SoundBank } from './audio.js';

const STEP = 1 / 60;

export class Game {
  constructor(canvas, seed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.seed = seed;
    this.terrain = new Terrain(seed);
    this.plane = new Plane();
    this.missions = new MissionSet(seed, this.terrain);
    this.sound = new SoundBank();
    this.state = STATE.TITLE;
    this.score = 0;
    this.totalStars = 0;
    this.lastStars = 0;
    this.upgrades = { tank: false, engine: false, handling: false };
    this.crashReason = '';
    this.time = 0;
    this.keys = {};
    this.mouse = { x: 0, y: 0, active: false };
    this.clouds = this.makeClouds();
    this.flash = 0;
    this.shake = 0;
    this.hold = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / r.width;
      this.mouse.y = (e.clientY - r.top) / r.height;
      this.mouse.active = true;
    });
    canvas.addEventListener('pointerdown', () => this.onClick());
  }

  get mission() {
    return this.missions.mission;
  }

  makeClouds() {
    const rng = makeRng(this.seed + 5);
    const clouds = [];
    for (let i = 0; i < 26; i += 1) {
      clouds.push({
        x: (rng() - 0.5) * 2400,
        y: 150 + rng() * 120,
        z: (rng() - 0.5) * 2400 + 800,
      });
    }
    return clouds;
  }

  resize() {
    const w = window.innerWidth || VIEW.width;
    const h = window.innerHeight || VIEW.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.w = w;
    this.h = h;
  }

  onClick() {
    this.sound.ensure();
    if (this.state === STATE.TITLE) this.startSortie();
    else if (this.state === STATE.PAUSED) this.state = STATE.FLYING;
    else if (this.state === STATE.LANDED) this.goUpgrade();
    else if (this.state === STATE.CRASHED || this.state === STATE.VICTORY) this.restartAll();
  }

  onKey(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    this.keys[k] = down;
    if (!down) return;
    this.sound.ensure();
    if (k === 'enter') {
      if (this.state === STATE.TITLE) this.startSortie();
      else if (this.state === STATE.LANDED) this.goUpgrade();
      else if (this.state === STATE.CRASHED || this.state === STATE.VICTORY) this.restartAll();
    }
    if (k === 'p' || k === 'escape') {
      if (this.state === STATE.FLYING) this.state = STATE.PAUSED;
      else if (this.state === STATE.PAUSED) this.state = STATE.FLYING;
    }
    if (k === 'r') this.restartAll();
    if (this.state === STATE.UPGRADE) {
      const idx = ['1', '2', '3'].indexOf(k);
      if (idx >= 0) this.buyUpgrade(UPGRADES[idx]);
      if (k === '4') this.nextSortie();
    }
  }

  startSortie() {
    const m = this.missions.mission;
    this.plane.reset(m.id, m.fuel + (this.upgrades.tank ? 30 : 0));
    this.plane.score = this.score;
    this.state = STATE.FLYING;
  }

  restartAll() {
    this.missions = new MissionSet(this.seed, this.terrain);
    this.score = 0;
    this.totalStars = 0;
    this.upgrades = { tank: false, engine: false, handling: false };
    this.plane = new Plane();
    this.state = STATE.TITLE;
  }

  buyUpgrade(u) {
    if (this.upgrades[u.id] || this.score < u.cost) return;
    this.score -= u.cost;
    this.upgrades[u.id] = true;
    this.sound.ringChime();
    this.nextSortie();
  }

  // Between sorties: offer one upgrade, paid from the score. The last
  // sortie has no next leg, so it goes straight to the victory screen.
  goUpgrade() {
    if (this.missions.missionIndex >= MISSIONS.length - 1) {
      this.nextSortie();
      return;
    }
    this.state = STATE.UPGRADE;
  }

  nextSortie() {
    this.missions.advance();
    if (this.missions.done) {
      this.state = STATE.VICTORY;
      this.sound.silence();
      return;
    }
    this.startSortie();
  }

  // Read the current input into a control packet for the flight model.
  readInput() {
    const k = this.keys;
    let pitch = 0;
    let roll = 0;
    if (k.arrowup || k.w) pitch += 1;
    if (k.arrowdown || k.s) pitch -= 1;
    if (k.arrowleft || k.a) roll -= 1;
    if (k.arrowright || k.d) roll += 1;
    // Mouse steering: pointer off-centre nudges pitch and roll gently.
    if (this.mouse.active && this.state === STATE.FLYING) {
      const mx = this.mouse.x - 0.5;
      const my = this.mouse.y - 0.5;
      if (Math.abs(mx) > 0.12) roll += clamp(mx * 1.6, -0.7, 0.7);
      if (Math.abs(my) > 0.12) pitch += clamp(-my * 1.4, -0.6, 0.6);
    }
    let throttleDelta = 0;
    if (k.shift || k.w && k.shift) throttleDelta += 0.5;
    if (k.control || k.s && k.control) throttleDelta -= 0.5;
    if (k['+'] || k['=']) throttleDelta += 0.5;
    if (k['-'] || k['_']) throttleDelta -= 0.5;
    return {
      pitch: clamp(pitch, -1, 1),
      roll: clamp(roll, -1, 1),
      throttleDelta,
      brake: !!k[' '],
      wind: this.mission.wind,
    };
  }

  update(dt) {
    this.time += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    // A staged screenshot scene holds its frame: no physics after staging,
    // so the captured frame is exactly the one the autopilot flew to.
    if (this.hold) return;
    if (this.state !== STATE.FLYING) return;
    const input = this.readInput();
    const hit = this.plane.step(dt, input, this.terrain, this.upgrades);
    this.score = this.plane.score;
    // Ring pass?
    const ring = this.missions.checkRing(this.plane);
    if (ring) {
      this.plane.score += SCORE.ring;
      this.score = this.plane.score;
      this.sound.ringChime();
      this.flash = 0.35;
    }
    // Warnings beep.
    if (this.plane.warnLowFuel || this.plane.warnTerrain) this.sound.warningBeep(this.time);
    this.sound.update(this.plane.throttle, this.plane.speed);
    // Landing or crash.
    if (hit === 'terrain') {
      const landing = this.plane.touchdown(this.terrain);
      const gentle = landing && this.missions.allRingsDone()
        && this.plane.verticalSpeed > -8 && this.plane.speed < 88;
      if (gentle) {
        this.finishLanding(landing);
        return;
      }
      const destroyed = this.plane.takeHit();
      this.shake = 0.5;
      this.sound.crash();
      if (destroyed || this.plane.fuel <= 0) {
        this.crashReason = this.plane.fuel <= 0
          ? 'Out of fuel over the archipelago — the sea took the plane.'
          : 'Three hard hits. The airframe gave up over the terrain.';
        this.state = STATE.CRASHED;
        this.sound.silence();
      }
    }
    // Out of fuel with no ground under the wheels yet: keep gliding down.
    if (this.plane.fuel <= 0 && this.plane.y < 12) {
      this.crashReason = 'Out of fuel — the plane came down short of the runway.';
      this.state = STATE.CRASHED;
      this.sound.silence();
    }
  }

  finishLanding(landing) {
    this.plane.score += SCORE.landingSmooth * (landing.smooth ? 1 : 0)
      + SCORE.landingCentre * (landing.centre ? 1 : 0);
    this.score = this.plane.score;
    const stars = this.missions.starsFor(this.plane.score, this.plane.elapsed, landing);
    this.lastStars = stars;
    this.totalStars += stars;
    this.sound.touchdown();
    this.sound.silence();
    this.state = STATE.LANDED;
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    }
    drawWorld(ctx, this, w, h);
    ctx.restore();
    if (this.state === STATE.FLYING || this.state === STATE.PAUSED) {
      drawHud(ctx, this, w, h);
    }
    if (this.state === STATE.TITLE) drawTitle(ctx, this, w, h);
    if (this.state === STATE.PAUSED) drawPaused(ctx, w, h);
    if (this.state === STATE.UPGRADE) drawUpgrade(ctx, this, w, h);
    if (this.state === STATE.LANDED) drawLanded(ctx, this, w, h);
    if (this.state === STATE.CRASHED) drawCrashed(ctx, this, w, h);
    if (this.state === STATE.VICTORY) drawVictory(ctx, this, w, h);
    if (this.state !== STATE.TITLE) drawVignette(ctx, w, h);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,210,62,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
    // After landing, the upgrade screen replaces the landed screen on Enter:
    // the state machine moves LANDED -> UPGRADE via nextSortie's caller.
  }

  frame(now) {
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000 || STEP);
    this.lastNow = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    requestAnimationFrame((t) => this.frame(t));
  }
}

// Boot: read ?seed=N and ?shot=..., then either play or stage a screenshot.
import { stageShot } from './shots.js';

export function boot(canvas) {
  const params = new URLSearchParams(window.location.search);
  const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
  const game = new Game(canvas, seed);
  const shot = params.get('shot');
  if (shot) stageShot(shot, game);
  game.start();
  return game;
}
