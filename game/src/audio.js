// Sound for Meridian Sortie: every sound is synthesised live with WebAudio.
// No audio files, no network — an engine drone that follows the throttle, wind
// noise that follows speed, a chime for each ring, a thud for touchdown and a
// beep when a warning lights up.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSrc = null;
    this.windGain = null;
    this.muted = false;
    this.lastBeep = 0;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Engine: two detuned sawtooth oscillators through a low-pass filter.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 82;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter);
    osc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    osc2.start();
    this.engineOsc2 = osc2;
    // Wind: looped white noise through a band-pass filter.
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.windSrc = this.ctx.createBufferSource();
    this.windSrc.buffer = buf;
    this.windSrc.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSrc.connect(band);
    band.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSrc.start();
  }

  // Called every frame while flying: drone pitch follows throttle, wind
  // volume follows speed.
  update(throttle, speed) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(48 + throttle * 60, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(72 + throttle * 90, t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.02 + throttle * 0.05, t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.max(0, (speed - 30) / 140) * 0.06, t, 0.1);
  }

  tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  ringChime() {
    this.tone(880, 0.35, 'sine', 0.18);
    this.tone(1318, 0.4, 'sine', 0.14, 0.08);
  }

  touchdown() {
    this.tone(90, 0.25, 'sine', 0.3);
    this.tone(140, 0.18, 'triangle', 0.2, 0.05);
  }

  crash() {
    this.tone(70, 0.7, 'sawtooth', 0.25);
    this.tone(45, 0.9, 'sine', 0.3, 0.1);
  }

  warningBeep(now) {
    if (now - this.lastBeep < 0.9) return;
    this.lastBeep = now;
    this.tone(1200, 0.12, 'square', 0.08);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, t, 0.05);
    this.windGain.gain.setTargetAtTime(0, t, 0.05);
  }
}
