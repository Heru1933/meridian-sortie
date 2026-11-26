// Rendering for Meridian Sortie: sky, projected terrain, rings, runway,
// clouds and the chase-view aircraft. Everything is drawn with the canvas
// 2D API from the game's own numbers — no images, no assets.
import { SKY, WORLD, RINGS } from './config.js';
import { clamp, lerp } from './random.js';

const FOCAL = 620;

// Project a world point into screen space from the camera.
// Returns { x, y, d } with d the forward distance, or null when behind.
export function project(cam, px, py, pz, w, h) {
  const dx = px - cam.x;
  const dy = py - cam.y;
  const dz = pz - cam.z;
  const sinH = Math.sin(cam.heading);
  const cosH = Math.cos(cam.heading);
  const fwd = dx * sinH + dz * cosH;
  const lat = dx * cosH - dz * sinH;
  if (fwd < 6) return null;
  const sx = w / 2 + (lat / fwd) * FOCAL;
  const horizon = h * 0.46 - cam.pitch * FOCAL * 0.9;
  const sy = horizon - ((dy) / fwd) * FOCAL;
  return { x: sx, y: sy, d: fwd };
}

function skyGradient(ctx, w, h, palette) {
  // Haze colour over the whole frame first, so any gap below the horizon
  // reads as haze, never as empty black.
  ctx.fillStyle = palette.low;
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, palette.top);
  g.addColorStop(0.55, palette.mid);
  g.addColorStop(1, palette.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.62 + 2);
}

function drawSun(ctx, w, h, palette, heading) {
  const sx = w * 0.72 - heading * 60;
  const sy = h * 0.16;
  const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
  g.addColorStop(0, palette.sun);
  g.addColorStop(0.35, 'rgba(255,240,190,0.55)');
  g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx, cam, w, h, cloud, palette) {
  const p = project(cam, cloud.x, cloud.y, cloud.z, w, h);
  if (!p || p.d > 900) return;
  const s = clamp(9000 / p.d, 6, 90);
  ctx.fillStyle = palette.low === '#f2a35e' ? 'rgba(70,52,80,0.75)' : 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(p.x + (i - 1) * s * 0.9, p.y + (i % 2) * s * 0.2, s * 1.1, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the terrain as projected grid quads, far to near so nearer ground
// paints over farther ground. Rows are spaced wider with distance.
export function drawTerrain(ctx, cam, terrain, w, h) {
  const rows = [];
  let d = 26;
  while (d < 760) {
    rows.push(d);
    d *= 1.28;
  }
  const halfSpan = 520;
  const cols = 26;
  for (let r = rows.length - 1; r >= 0; r -= 1) {
    const d0 = rows[r];
    const d1 = r + 1 < rows.length ? rows[r + 1] : d0 * 1.3;
    for (let c = 0; c < cols; c += 1) {
      const f0 = c / cols;
      const f1 = (c + 1) / cols;
      const lat0 = -halfSpan + f0 * halfSpan * 2;
      const lat1 = -halfSpan + f1 * halfSpan * 2;
      const corners = [];
      let ok = true;
      for (const [lat, dep] of [[lat0, d0], [lat1, d0], [lat1, d1], [lat0, d1]]) {
        const wx = cam.x + Math.sin(cam.heading) * dep + Math.cos(cam.heading) * lat;
        const wz = cam.z + Math.cos(cam.heading) * dep - Math.sin(cam.heading) * lat;
        const wy = terrain.heightAt(wx, wz);
        const p = project(cam, wx, wy, wz, w, h);
        if (!p) { ok = false; break; }
        corners.push(p);
      }
      if (!ok) continue;
      const midLat = (lat0 + lat1) / 2;
      const midDep = (d0 + d1) / 2;
      const mx = cam.x + Math.sin(cam.heading) * midDep + Math.cos(cam.heading) * midLat;
      const mz = cam.z + Math.cos(cam.heading) * midDep - Math.sin(cam.heading) * midLat;
      const mh = terrain.heightAt(mx, mz);
      const kind = terrain.groundKind(mx, mz, mh);
      ctx.fillStyle = terrain.groundColor(kind, mx, mz, mh);
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// The runway: a dark strip with a centre line, threshold bars and edge lights.
export function drawRunway(ctx, cam, w, h) {
  const rw = WORLD.runwayWidth;
  const rl = WORLD.runwayLength;
  // The near end of the strip can sit behind the camera on final approach;
  // clamp it just ahead of the camera so the strip still draws.
  const z0 = Math.max(WORLD.runwayZ - rl / 2, cam.z + 12);
  const z1 = WORLD.runwayZ + rl / 2;
  const pts = [];
  for (const [x, z] of [[-rw, z0], [rw, z0], [rw, z1], [-rw, z1]]) {
    const p = project(cam, WORLD.runwayX + x, 6.5, z, w, h);
    if (!p) return;
    pts.push(p);
  }
  ctx.fillStyle = '#3a3d42';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Centre dashes.
  ctx.fillStyle = '#f5f5e8';
  for (let z = z0 + 14; z < z1 - 10; z += 28) {
    const a = project(cam, WORLD.runwayX - 1.2, 6.8, z, w, h);
    const b = project(cam, WORLD.runwayX + 1.2, 6.8, z + 14, w, h);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x + (b.x - a.x) * 0.1, b.y);
    ctx.lineTo(a.x + (a.x - b.x) * 0.1, a.y);
    ctx.closePath();
    ctx.fill();
  }
  // Edge lights, amber, glowing.
  for (let z = z0; z <= z1; z += 32) {
    for (const side of [-1, 1]) {
      const p = project(cam, WORLD.runwayX + side * (rw + 2), 7.5, z, w, h);
      if (!p) continue;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(p.x, p.y, clamp(140 / p.d, 1, 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// A target ring: a glowing circle standing in the sky, with a small post
// down to the ground so its height reads at a glance.
export function drawRing(ctx, cam, ring, w, h, active) {
  const p = project(cam, ring.x, ring.y, ring.z, w, h);
  if (!p || p.d > 900) return;
  const r = (RINGS.radius * FOCAL) / p.d;
  if (r < 2) return;
  const ground = project(cam, ring.x, ring.groundY, ring.z, w, h);
  if (ground) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + r);
    ctx.lineTo(ground.x, ground.y);
    ctx.stroke();
  }
  const glow = active ? '#ffd23e' : '#7ee2a8';
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = glow;
  ctx.lineWidth = clamp(r * 0.14, 2, 9);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = active ? '#fff6c9' : '#eafff1';
  ctx.font = `bold ${Math.max(11, Math.round(r * 0.4))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(ring.index + 1), p.x, p.y);
}

// The aircraft, drawn as a vector prop plane seen from behind and slightly
// above, banking with the roll. The propeller is a translucent blur disc.
export function drawPlane(ctx, w, h, roll, throttle, time) {
  const cx = w / 2;
  const cy = h * 0.66;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(roll * 0.9);
  const s = 1;
  // Tailplane and fin.
  ctx.fillStyle = '#b8322a';
  ctx.beginPath();
  ctx.moveTo(-34 * s, -52 * s);
  ctx.lineTo(34 * s, -52 * s);
  ctx.lineTo(22 * s, -62 * s);
  ctx.lineTo(-22 * s, -62 * s);
  ctx.closePath();
  ctx.fill();
  // Main wings.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath();
  ctx.moveTo(-118 * s, -6 * s);
  ctx.lineTo(-96 * s, -22 * s);
  ctx.lineTo(96 * s, -22 * s);
  ctx.lineTo(118 * s, -6 * s);
  ctx.lineTo(96 * s, 6 * s);
  ctx.lineTo(-96 * s, 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(-96 * s, -16 * s, 192 * s, 3);
  // Fuselage.
  const body = ctx.createLinearGradient(0, -70 * s, 0, 26 * s);
  body.addColorStop(0, '#f2ede2');
  body.addColorStop(0.5, '#e8dfc9');
  body.addColorStop(1, '#b9a888');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -78 * s);
  ctx.quadraticCurveTo(20 * s, -60 * s, 22 * s, -18 * s);
  ctx.quadraticCurveTo(23 * s, 8 * s, 12 * s, 24 * s);
  ctx.quadraticCurveTo(0, 30 * s, -12 * s, 24 * s);
  ctx.quadraticCurveTo(-23 * s, 8 * s, -22 * s, -18 * s);
  ctx.quadraticCurveTo(-20 * s, -60 * s, 0, -78 * s);
  ctx.fill();
  // Canopy.
  ctx.fillStyle = '#7ec8e8';
  ctx.beginPath();
  ctx.ellipse(0, -52 * s, 11 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -58 * s, 4 * s, 8 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Propeller blur, spinning faster with throttle.
  const blur = 0.10 + throttle * 0.22;
  ctx.fillStyle = `rgba(60,60,60,${blur})`;
  ctx.beginPath();
  ctx.ellipse(0, -78 * s, 26 * s, 30 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,40,0.85)';
  ctx.lineWidth = 3;
  const a = time * (6 + throttle * 30);
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * 26 * s, -78 * s + Math.sin(a) * 30 * s);
  ctx.lineTo(-Math.cos(a) * 26 * s, -78 * s - Math.sin(a) * 30 * s);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,60,60,0.85)';
  ctx.beginPath();
  ctx.arc(0, -78 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Rain streaks for the dusk storm sortie.
export function drawRain(ctx, w, h, time) {
  ctx.strokeStyle = 'rgba(200,210,230,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 90; i += 1) {
    const x = ((i * 173 + time * 900) % (w + 40)) - 20;
    const y = ((i * 97 + time * 1400) % (h + 40)) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y + 22);
  }
  ctx.stroke();
}

export function drawWorld(ctx, game, w, h) {
  const palette = SKY[game.mission.timeOfDay];
  const cam = {
    x: game.plane.x - Math.sin(game.plane.heading) * 16,
    y: game.plane.y + 4.5,
    z: game.plane.z - Math.cos(game.plane.heading) * 16,
    heading: game.plane.heading,
    pitch: game.plane.pitch,
  };
  skyGradient(ctx, w, h, palette);
  drawSun(ctx, w, h, palette, game.plane.heading);
  drawTerrain(ctx, cam, game.terrain, w, h);
  drawRunway(ctx, cam, w, h);
  for (const cloud of game.clouds) drawCloud(ctx, cam, w, h, cloud, palette);
  const next = game.missions.nextRing();
  for (const ring of game.missions.rings) {
    if (ring.done) continue;
    drawRing(ctx, cam, ring, w, h, ring === next);
  }
  // Soft haze fading in just below the horizon, so far ground melts into sky.
  const fog = ctx.createLinearGradient(0, h * 0.40, 0, h * 0.56);
  fog.addColorStop(0, 'rgba(207,230,242,0)');
  fog.addColorStop(1, palette.fog);
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * 0.40, w, h * 0.16);
  drawPlane(ctx, w, h, game.plane.roll, game.plane.throttle, game.time);
  if (game.mission.timeOfDay === 'dusk') drawRain(ctx, w, h, game.time);
}
