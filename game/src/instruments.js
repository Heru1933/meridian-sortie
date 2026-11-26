// Instruments and screens for Meridian Sortie: the HUD, the cockpit panel
// with its lit gauges, and every full-screen state (title, pause, upgrade,
// landing, crash, victory). All canvas-drawn, in one visual language.
import { PLANE, WORLD, UPGRADES, SCORE } from './config.js';
import { clamp } from './random.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function gauge(ctx, cx, cy, r, label, value, max, unit, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4356';
  ctx.lineWidth = 2;
  ctx.stroke();
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.strokeStyle = '#2a3242';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 7, a0, a1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 7, a0, a0 + (a1 - a0) * clamp(value / max, 0, 1));
  ctx.stroke();
  const ang = a0 + (a1 - a0) * clamp(value / max, 0, 1);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(ang) * (r - 12), Math.sin(ang) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(value)), 0, 2);
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '10px sans-serif';
  ctx.fillText(label, 0, r - 16);
  ctx.fillText(unit, 0, r - 5);
  ctx.restore();
}

function horizonGauge(ctx, cx, cy, r, pitch, roll) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#5ea3d8';
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.save();
  ctx.rotate(-roll);
  const dy = pitch * r * 1.6;
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, dy, r * 2, r * 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-r, dy - 1, r * 2, 2);
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0);
  ctx.lineTo(-r * 0.15, 0);
  ctx.lineTo(0, -r * 0.2);
  ctx.lineTo(r * 0.15, 0);
  ctx.lineTo(r * 0.55, 0);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#3a4356';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, cy + r + 12);
}

function compassStrip(ctx, w, heading) {
  const cx = w / 2;
  const y = 26;
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  roundRect(ctx, cx - 190, y - 14, 380, 30, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, cx - 190, y - 14, 380, 30, 8);
  ctx.clip();
  const deg = ((heading * 180 / Math.PI) % 360 + 360) % 360;
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -120; d <= 120; d += 15) {
    const hd = ((Math.round(deg) + d) % 360 + 360) % 360;
    const x = cx + d * 2.6;
    ctx.strokeStyle = '#9fb2cc';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y - 2);
    ctx.stroke();
    const lab = labels[hd] || String(hd);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lab, x, y - 5);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx, y + 14);
  ctx.lineTo(cx - 6, y + 4);
  ctx.lineTo(cx + 6, y + 4);
  ctx.closePath();
  ctx.fill();
}

// The bottom cockpit panel: attitude, airspeed, altitude, fuel, throttle.
export function drawInstruments(ctx, game, w, h) {
  const p = game.plane;
  const y0 = h - 128;
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.fillRect(0, y0 - 8, w, 136);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, y0 - 8);
  ctx.lineTo(w, y0 - 8);
  ctx.stroke();
  horizonGauge(ctx, 120, y0 + 52, 44, p.pitch, p.roll);
  gauge(ctx, 250, y0 + 52, 44, 'AIRSPEED', p.speed * 2.2, 260, 'kt', '#5ec8f0');
  gauge(ctx, 380, y0 + 52, 44, 'ALTITUDE', p.y * 3.3, 700, 'ft', '#8fe08a');
  // Fuel bar.
  const fx = 480;
  ctx.fillStyle = '#10141c';
  roundRect(ctx, fx, y0 + 16, 180, 20, 6);
  ctx.fill();
  const fuelFrac = p.fuel / p.maxFuel(game.upgrades);
  ctx.fillStyle = fuelFrac < 0.18 ? '#ff5a4e' : '#ffb347';
  roundRect(ctx, fx + 2, y0 + 18, Math.max(4, 176 * fuelFrac), 16, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`FUEL ${Math.round(p.fuel)}`, fx, y0 + 52);
  // Throttle bar.
  const tx = 480;
  ctx.fillStyle = '#10141c';
  roundRect(ctx, tx, y0 + 66, 180, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#5ec8f0';
  roundRect(ctx, tx + 2, y0 + 68, Math.max(4, 176 * p.throttle), 16, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(`THROTTLE ${Math.round(p.throttle * 100)}%`, tx, y0 + 102);
  // Damage lights.
  for (let i = 0; i < PLANE.maxDamage; i += 1) {
    ctx.fillStyle = i < p.damage ? '#ff5a4e' : 'rgba(255,90,78,0.25)';
    ctx.beginPath();
    ctx.arc(700 + i * 26, y0 + 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '11px sans-serif';
  ctx.fillText('HULL', 700, y0 + 52);
  // Warnings.
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  let warnY = y0 + 76;
  if (p.warnLowFuel) {
    ctx.fillStyle = '#ff5a4e';
    ctx.fillText('⚠ LOW FUEL', 690, warnY);
    warnY += 20;
  }
  if (p.warnTerrain) {
    ctx.fillStyle = '#ffb347';
    ctx.fillText('⚠ TERRAIN', 690, warnY);
    warnY += 20;
  }
  if (p.speed < 36) {
    ctx.fillStyle = '#ffd23e';
    ctx.fillText('⚠ SLOW — ADD POWER', 690, warnY);
  }
}

export function drawHud(ctx, game, w, h) {
  const p = game.plane;
  compassStrip(ctx, w, p.heading);
  // Top-left: mission and score.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,14,22,0.72)';
  roundRect(ctx, 14, 14, 260, 74, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`SORTIE ${game.mission.id} — ${game.mission.name.toUpperCase()}`, 26, 38);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`SCORE ${game.score}    RINGS ${p.ringsPassed}/${game.missions.rings.length}`, 26, 60);
  ctx.fillStyle = '#9fb2cc';
  ctx.fillText(`TIME ${Math.floor(p.elapsed)}s    FUEL ${Math.round(p.fuel)}`, 26, 78);
  // Top-right: next-ring pointer.
  const next = game.missions.nextRing();
  if (next) {
    ctx.fillStyle = 'rgba(10,14,22,0.72)';
    roundRect(ctx, w - 244, 14, 230, 74, 10);
    ctx.fill();
    const dx = next.x - p.x;
    const dz = next.z - p.z;
    const dist = Math.hypot(dx, dz);
    const rel = Math.atan2(dx, dz) - p.heading;
    const arrow = clamp(rel, -1.2, 1.2);
    ctx.save();
    ctx.translate(w - 200, 52);
    ctx.rotate(arrow);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 8);
    ctx.lineTo(0, 3);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`RING ${next.index + 1}`, w - 168, 46);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#9fb2cc';
    ctx.fillText(`${Math.round(dist)} m ahead`, w - 168, 66);
    ctx.fillText(`ALT ${Math.round(next.y * 3.3)} ft`, w - 168, 82);
  }
  drawInstruments(ctx, game, w, h);
}

function titleCard(ctx, w, h, lines, footer) {
  ctx.fillStyle = 'rgba(6,10,18,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  let y = h * 0.3;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = line.font;
    ctx.fillText(line.text, w / 2, y);
    y += line.gap;
  }
  if (footer) {
    ctx.fillStyle = '#cdd8e8';
    ctx.font = '15px sans-serif';
    ctx.fillText(footer, w / 2, h * 0.82);
  }
}

export function drawTitle(ctx, game, w, h) {
  titleCard(ctx, w, h, [
    { text: 'MERIDIAN SORTIE', color: '#ffd23e', font: 'bold 64px sans-serif', gap: 76 },
    { text: 'A chase-view flight game over a procedural archipelago', color: '#fff', font: '20px sans-serif', gap: 34 },
    { text: 'Fly the rings. Mind the fuel. Land on the runway.', color: '#cdd8e8', font: '17px sans-serif', gap: 40 },
    { text: 'CLICK OR PRESS ENTER TO FLY', color: '#8fe08a', font: 'bold 18px sans-serif', gap: 30 },
  ], 'Arrows / WASD pitch & roll · Shift throttle up · Ctrl throttle down · Space flaps · P pause · R restart');
}

export function drawPaused(ctx, w, h) {
  titleCard(ctx, w, h, [
    { text: 'PAUSED', color: '#fff', font: 'bold 52px sans-serif', gap: 70 },
    { text: 'Press P or click to keep flying', color: '#cdd8e8', font: '18px sans-serif', gap: 30 },
  ], null);
}

export function drawUpgrade(ctx, game, w, h) {
  titleCard(ctx, w, h, [
    { text: 'SORTIE COMPLETE', color: '#8fe08a', font: 'bold 46px sans-serif', gap: 60 },
    { text: `Score ${game.score} — choose one upgrade (press 1, 2 or 3)`, color: '#fff', font: '19px sans-serif', gap: 44 },
  ], null);
  const bw = 260;
  const gap = 24;
  const x0 = w / 2 - (bw * 3 + gap * 2) / 2;
  UPGRADES.forEach((u, i) => {
    const x = x0 + i * (bw + gap);
    const y = h * 0.52;
    const owned = game.upgrades[u.id];
    panel(ctx, x, y, bw, 110);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${i + 1} · ${u.name}`, x + bw / 2, y + 30);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(u.desc, x + bw / 2, y + 56);
    ctx.fillStyle = owned ? '#8fe08a' : '#9fb2cc';
    ctx.fillText(owned ? 'OWNED' : `${u.cost} pts`, x + bw / 2, y + 84);
  });
  ctx.fillStyle = '#cdd8e8';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press 4 to skip and fly the next sortie as-is.', w / 2, h * 0.52 + 150);
}

export function drawLanded(ctx, game, w, h) {
  const p = game.plane;
  const stars = game.lastStars || 0;
  titleCard(ctx, w, h, [
    { text: 'WHEELS DOWN', color: '#8fe08a', font: 'bold 52px sans-serif', gap: 64 },
    { text: `Sortie ${game.mission.id} complete — ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, color: '#ffd23e', font: 'bold 24px sans-serif', gap: 40 },
    { text: `Landing ${p.landedSmooth ? 'smooth' : 'firm'}${p.landedCentre ? ' · on the centreline' : ''} · Score ${game.score}`, color: '#fff', font: '18px sans-serif', gap: 36 },
    { text: 'Press ENTER for the next sortie', color: '#cdd8e8', font: '17px sans-serif', gap: 30 },
  ], null);
}

export function drawCrashed(ctx, game, w, h) {
  titleCard(ctx, w, h, [
    { text: 'AIRCRAFT LOST', color: '#ff5a4e', font: 'bold 52px sans-serif', gap: 64 },
    { text: game.crashReason || 'The sortie ended in the terrain.', color: '#fff', font: '19px sans-serif', gap: 40 },
    { text: `Score ${game.score} — press R to fly it again`, color: '#cdd8e8', font: '17px sans-serif', gap: 30 },
  ], null);
}

export function drawVictory(ctx, game, w, h) {
  titleCard(ctx, w, h, [
    { text: 'ALL SORTIES FLOWN', color: '#ffd23e', font: 'bold 52px sans-serif', gap: 64 },
    { text: `Final score ${game.score} · ${game.totalStars} of 9 stars`, color: '#fff', font: '21px sans-serif', gap: 40 },
    { text: 'The Meridian archipelago is yours. Press R to fly again.', color: '#cdd8e8', font: '17px sans-serif', gap: 30 },
  ], null);
}

export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
