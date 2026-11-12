// Goong55 — DSP core of a Moog System 55-style modular emulation.
// Pure ES module: used by the AudioWorklet and by the offline Node tests.
// All signals are in volts. Pitch is 1 V/oct, 0 V = C2 (65.41 Hz) with an oscillator on 8'.
// Audio is nominally ±1 V, envelopes peak at 5.5 V, V-triggers are 0/5 V, S-triggers are 0/1 (1 = closed).
// The whole graph runs sample-by-sample at 2x the output rate and is decimated at the end.

const LN2 = Math.LN2;
const C2 = 65.40639132514966;
const exp2 = (x) => Math.exp(x * LN2);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
// 0..10 knob -> time with exponential taper
const knobTime = (v, tmin, tmax) => tmin * Math.pow(tmax / tmin, clamp(v, 0, 10) / 10);

class Mod {
  constructor(fs) {
    const C = this.constructor;
    this.fs = fs;
    this.p = new Float64Array(C.params.length);
    this.pt = new Float64Array(C.params.length);
    this.in = new Float64Array(C.ins.length);
    this.out = new Float64Array(C.outs.length);
    this.ic = new Uint8Array(C.ins.length);
    this.oc = new Uint8Array(C.outs.length);
    this.wSrc = []; this.wSi = []; this.wDi = []; this.wG = []; this.zero = [];
    this.deps = [];
  }
  ctl() {}
  tick() {}
  state() { return null; }
}
Mod.params = []; Mod.ins = []; Mod.outs = [];

// ---------------------------------------------------------------- oscillators
// Sawtooth-core VCO (as the 921 family): an exponential current source charges an integrator
// that a comparator resets. Triangle is the full-wave rectified saw, sine is the shaped triangle,
// rectangular is a comparator on the saw. Band-limited with polyBLEP at the 2x rate.
function pblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

class OscCore {
  constructor(fs) {
    this.fs = fs;
    this.ph = Math.random();
    this.offs = (Math.random() - 0.5) * 0.0025;   // fixed calibration error, ~±1.5 cent
    this.drift = 0; this.dT = 0;
    this.lastSync = 0; this.acz = 0;
    this.saw = 0; this.tri = 0; this.sin = 0; this.rect = 0;
  }
  ctl() { // slow thermal drift of the expo converter (random walk, ~1.5 cent rms)
    this.dT = this.dT * 0.99995 + (Math.random() - 0.5) * 4.2e-5;
    this.drift += (this.dT - this.drift) * 0.01;
  }
  // linear FM input, AC coupled (5 Hz high-pass)
  ac(x) { this.acz += (x - this.acz) * (31.4 / this.fs); return x - this.acz; }
  step(f, w, sync, syncMode, needSin) {
    let dt = f / this.fs;
    if (dt > 0.45) dt = 0.45; else if (dt < 0) dt = 0;
    let ph = this.ph + dt;
    if (ph >= 1) ph -= 1;
    if (syncMode !== 1) {
      if (sync > 0 && this.lastSync <= 0) {
        if (syncMode === 2 || ph > 0.72) ph = 0;   // strong: always; weak: only near the end of the ramp
      }
    }
    this.lastSync = sync;
    this.ph = ph;
    this.saw = 2 * ph - 1 - pblep(ph, dt);
    const tri = 4 * (ph < 0.5 ? 0.5 - ph : ph - 0.5) - 1;
    this.tri = tri;
    if (needSin) this.sin = 0.985 * Math.sin(1.5707963 * tri) + 0.015 * tri; // shaper residue
    let pw = ph - w; if (pw < 0) pw += 1;
    this.rect = 0.8 * ((ph < w ? 1 : -1) + pblep(ph, dt) - pblep(pw, dt));
  }
}

class Vco921 extends Mod {
  constructor(fs) { super(fs); this.core = new OscCore(fs); this.base = 0; this.w = 0.5; }
  ctl() {
    const p = this.p, c = this.core;
    c.ctl();
    this.base = (p[1] > 0.5 ? p[0] * 0.5 : p[0] / 12) + (p[2] - 2) + (p[3] > 0.5 ? -9 : 0) + c.offs + c.drift;
    this.w = 0.05 + 0.09 * p[4];
  }
  tick() {
    const i = this.in, o = this.out, c = this.core, p = this.p;
    let f = C2 * exp2(this.base + i[0] + i[1] + i[2]);
    if (this.ic[4] | this.ic[5]) { f *= 1 + 0.5 * (i[5] + c.ac(i[4])); }
    const w = clamp(this.w + 0.1 * i[3], 0.03, 0.97);
    const aw = p[5];
    c.step(f, w, i[6], p[7], this.oc[0] || (this.oc[4] && aw === 0));
    o[0] = c.sin; o[1] = c.tri; o[2] = c.saw; o[3] = c.rect;
    if (this.oc[4]) {
      const a = aw === 0 ? c.sin : aw === 1 ? c.tri : aw === 2 ? c.saw : aw === 3 ? -c.saw : aw === 4 ? c.rect : -c.rect;
      o[4] = a * p[6] * 0.1;
    }
  }
}
Vco921.params = ['freq', 'scale', 'range', 'lo', 'width', 'auxw', 'auxl', 'syncm'];
Vco921.ins = ['f1', 'f2', 'f3', 'w', 'ac', 'dc', 'sync'];
Vco921.outs = ['sine', 'tri', 'saw', 'rect', 'aux'];

// 921A oscillator driver: sums the control voltages and feeds its 921B bank through an internal bus.
class Drv921a extends Mod {
  ctl() {
    const p = this.p;
    this.f = p[1] > 0.5 ? p[0] * 0.5 : p[0] / 12;
    this.w = 0.05 + 0.09 * p[2];
  }
  tick() {
    const i = this.in;
    this.out[0] = this.f + i[0] + i[1] + i[2];
    this.out[1] = this.w + 0.1 * (i[3] + i[4]);
  }
}
Drv921a.params = ['freq', 'scale', 'width'];
Drv921a.ins = ['f1', 'f2', 'f3', 'w1', 'w2'];
Drv921a.outs = ['busf', 'busw'];

class Osc921b extends Mod {
  constructor(fs) { super(fs); this.core = new OscCore(fs); this.base = 0; }
  ctl() {
    const p = this.p, c = this.core;
    c.ctl();
    this.base = p[0] / 12 + (p[1] - 2) + c.offs + c.drift;
  }
  tick() {
    const i = this.in, o = this.out, c = this.core;
    let f = C2 * exp2(this.base + i[0]);
    if (this.ic[3] | this.ic[4]) { f *= 1 + 0.5 * (i[4] + c.ac(i[3])); }
    const w = this.ic[1] ? clamp(i[1], 0.03, 0.97) : 0.5;
    c.step(f, w, i[2], this.p[2], this.oc[0]);
    o[0] = c.sin; o[1] = c.tri; o[2] = c.saw; o[3] = c.rect;
  }
}
Osc921b.params = ['freq', 'range', 'syncm'];
Osc921b.ins = ['busf', 'busw', 'sync', 'ac', 'dc'];
Osc921b.outs = ['sine', 'tri', 'saw', 'rect'];

// ---------------------------------------------------------------- 904A transistor ladder low-pass
// Four cascaded differential-pair stages on a common exponential current sink (24 dB/oct), each
// with tanh() large-signal behaviour, global feedback ("regeneration") from the last stage.
// Huovilainen's nonlinear model, 2x internally oversampled (4x overall), no passband gain
// compensation — the bass drops as regeneration rises, as on the hardware.
const LAD_DRIVE = 0.4; // 1 / (2·Vt) scaled to the module's input attenuation, per volt
class Lpf904a extends Mod {
  constructor(fs) {
    super(fs);
    this.s0 = 0; this.s1 = 0; this.s2 = 0; this.s3 = 0; this.d4 = 0; this.d5 = 0;
    this.t0 = 0; this.t1 = 0; this.t2 = 0;
    this.lcv = NaN; this.tune = 0; this.acr = 1; this.res = 0;
  }
  ctl() { this.res = this.p[2] * 0.115; }
  tick() {
    const p = this.p, i = this.in;
    const cv = p[0] + 2 * (p[1] - 1) + i[1] + i[2] + i[3];
    if (cv !== this.lcv) {
      this.lcv = cv;
      const fc = clamp(320 * exp2(cv), 1, 21000) / this.fs;
      const fc2 = fc * fc;
      const fcr = 1.8730 * fc2 * fc + 0.4955 * fc2 - 0.6490 * fc + 0.9988;
      this.acr = -3.9364 * fc2 + 1.8409 * fc + 0.9968;
      this.tune = (1 - Math.exp(-Math.PI * fc * fcr)) / LAD_DRIVE;
    }
    const tune = this.tune, res4 = 4 * this.res * this.acr;
    const x = i[0] + (Math.random() - 0.5) * 2e-5; // thermal noise, starts self-oscillation
    let s0 = this.s0, s1 = this.s1, s2 = this.s2, s3 = this.s3, d4 = this.d4, d5 = this.d5;
    let t0 = this.t0, t1 = this.t1, t2 = this.t2;
    for (let j = 0; j < 2; j++) {
      const inp = Math.tanh((x - res4 * d5) * LAD_DRIVE);
      s0 += tune * (inp - t0);
      t0 = Math.tanh(s0 * LAD_DRIVE);
      s1 += tune * (t0 - t1);
      t1 = Math.tanh(s1 * LAD_DRIVE);
      s2 += tune * (t1 - t2);
      t2 = Math.tanh(s2 * LAD_DRIVE);
      s3 += tune * (t2 - Math.tanh(s3 * LAD_DRIVE));
      d5 = (s3 + d4) * 0.5; // half-sample delay for feedback phase compensation
      d4 = s3;
    }
    this.s0 = s0; this.s1 = s1; this.s2 = s2; this.s3 = s3; this.d4 = d4; this.d5 = d5;
    this.t0 = t0; this.t1 = t1; this.t2 = t2;
    this.out[0] = d5;
  }
}
Lpf904a.params = ['freq', 'range', 'regen'];
Lpf904a.ins = ['in', 'c1', 'c2', 'c3'];
Lpf904a.outs = ['out'];

// 904B high-pass, 24 dB/oct, no regeneration. Four trapezoidal one-pole sections.
class Hpf904b extends Mod {
  constructor(fs) { super(fs); this.z = new Float64Array(4); this.lcv = NaN; this.G = 0; }
  tick() {
    const p = this.p, i = this.in, z = this.z;
    const cv = p[0] + 3 * p[1] + i[1] + i[2] + i[3];
    if (cv !== this.lcv) {
      this.lcv = cv;
      const g = Math.tan(Math.PI * clamp(100 * exp2(cv), 1, 21000) / this.fs);
      this.G = g / (1 + g);
    }
    const G = this.G;
    let x = 2.5 * Math.tanh(i[0] * 0.4);
    for (let k = 0; k < 4; k++) {
      const v = (x - z[k]) * G, lp = v + z[k];
      z[k] = lp + v;
      x -= lp;
    }
    this.out[0] = x;
  }
}
Hpf904b.params = ['freq', 'range'];
Hpf904b.ins = ['in', 'c1', 'c2', 'c3'];
Hpf904b.outs = ['out'];

// ---------------------------------------------------------------- 902 VCA
// Differential-pair amplifier: differential signal inputs, summed control inputs,
// linear (gain ∝ volts, unity at 6 V) or exponential (12 dB/V) response, max gain x2.
class Vca902 extends Mod {
  tick() {
    const p = this.p, i = this.in;
    const vc = p[0] * 0.6 + i[2] + i[3] + i[4];
    let g;
    if (p[1] > 0.5) g = vc <= -6 ? 0 : Math.exp((vc - 6) * 1.3815510558); // 12 dB/V
    else g = vc <= 0 ? 0 : vc * (1 / 6);
    if (g > 2) g = 2;
    const y = 3 * Math.tanh((i[0] - i[1]) * (1 / 3)) * g;
    this.out[0] = y; this.out[1] = -y;
  }
}
Vca902.params = ['gain', 'mode'];
Vca902.ins = ['sigp', 'sign', 'c1', 'c2', 'c3'];
Vca902.outs = ['outp', 'outn'];

// ---------------------------------------------------------------- 911 envelope generator
// RC contour: T1 charges towards a level above the peak (comparator ends the attack),
// T2 discharges to Esus while the S-trigger is held, T3 discharges to zero on release.
const ENV_PEAK = 5.5;
class Eg911 extends Mod {
  constructor(fs) { super(fs); this.v = 0; this.stage = 0; this.pg = false; this.ka = 0; this.kd = 0; this.kr = 0; }
  ctl() {
    const p = this.p, fs = this.fs;
    this.ka = 1 - Math.exp(-1.79 / (knobTime(p[0], 0.002, 10) * fs));
    this.kd = 1 - Math.exp(-4 / (knobTime(p[1], 0.002, 10) * fs));
    this.kr = 1 - Math.exp(-4 / (knobTime(p[3], 0.002, 10) * fs));
  }
  tick() {
    const g = this.in[0] > 0.5;
    if (g && !this.pg) this.stage = 1; else if (!g) this.stage = 0;
    this.pg = g;
    let v = this.v;
    if (this.stage === 1) { v += (1.2 - v) * this.ka; if (v >= 1) { v = 1; this.stage = 2; } }
    else if (this.stage === 2) v += (this.p[2] * 0.1 - v) * this.kd;
    else v -= v * this.kr;
    this.v = v;
    this.out[0] = this.out[1] = v * ENV_PEAK;
  }
}
Eg911.params = ['t1', 't2', 'es', 't3'];
Eg911.ins = ['trig'];
Eg911.outs = ['o1', 'o2'];

// 911A dual trigger delay. mode: 0 off (independent), 1 parallel, 2 series.
class Dly911a extends Mod {
  constructor(fs) { super(fs); this.c = [0, 0]; this.pg = [false, false]; this.n = [0, 0]; }
  ctl() { this.n[0] = knobTime(this.p[0], 0.002, 10) * this.fs; this.n[1] = knobTime(this.p[1], 0.002, 10) * this.fs; }
  sec(k, g) {
    if (g) { if (!this.pg[k]) this.c[k] = 0; this.c[k]++; }
    this.pg[k] = g;
    return g && this.c[k] >= this.n[k] ? 1 : 0;
  }
  tick() {
    const m = this.p[2], i = this.in;
    const a = this.sec(0, i[0] > 0.5);
    const b = this.sec(1, m === 1 ? i[0] > 0.5 : m === 2 ? a > 0.5 : i[1] > 0.5);
    this.out[0] = a; this.out[1] = b;
  }
}
Dly911a.params = ['t1', 't2', 'mode'];
Dly911a.ins = ['in1', 'in2'];
Dly911a.outs = ['o1', 'o2'];

// ---------------------------------------------------------------- 903A random signal generator
class Noise903a extends Mod {
  constructor(fs) { super(fs); this.b = new Float64Array(7); }
  tick() {
    const w = (Math.random() + Math.random() + Math.random() - 1.5) * 0.8; // ~gaussian, 0.4 V rms
    const b = this.b, o = this.out;
    o[0] = o[1] = w;
    if (this.oc[2] | this.oc[3]) { // -3 dB/oct (Kellet)
      b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759;
      b[2] = 0.96900 * b[2] + w * 0.1538520; b[3] = 0.86650 * b[3] + w * 0.3104856;
      b[4] = 0.55000 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.0168980;
      o[2] = o[3] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.22;
      b[6] = w * 0.115926;
    }
  }
}
Noise903a.params = []; Noise903a.ins = []; Noise903a.outs = ['w1', 'w2', 'p1', 'p2'];

// ---------------------------------------------------------------- 914 fixed filter bank
// Low-pass, 12 half-octave band-pass resonators, high-pass; each with its own attenuator.
export const FFB_FREQS = [88, 125, 175, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 7000];
class Ffb914 extends Mod {
  constructor(fs) {
    super(fs);
    const n = 14;
    this.a1 = new Float64Array(n); this.a2 = new Float64Array(n); this.a3 = new Float64Array(n);
    this.k = new Float64Array(n); this.z1 = new Float64Array(n); this.z2 = new Float64Array(n);
    this.g = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      const g = Math.tan(Math.PI * FFB_FREQS[j] / fs);
      const k = (j === 0 || j === 13) ? 1.414 : 1 / 4.5;
      this.k[j] = k;
      this.a1[j] = 1 / (1 + g * (g + k)); this.a2[j] = g * this.a1[j]; this.a3[j] = g * this.a2[j];
    }
  }
  ctl() { for (let j = 0; j < 14; j++) { const v = this.p[j] * 0.1; this.g[j] = v * v; } }
  tick() {
    const x = this.in[0], z1 = this.z1, z2 = this.z2, a1 = this.a1, a2 = this.a2, a3 = this.a3, k = this.k, g = this.g;
    let y = 0;
    for (let j = 0; j < 14; j++) {
      const v3 = x - z2[j];
      const v1 = a1[j] * z1[j] + a2[j] * v3;
      const v2 = z2[j] + a2[j] * z1[j] + a3[j] * v3;
      z1[j] = 2 * v1 - z1[j]; z2[j] = 2 * v2 - z2[j];
      if (j === 0) y += v2 * g[0];
      else if (j === 13) y += (x - k[13] * v1 - v2) * g[13];
      else y += ((j & 1) ? v1 : -v1) * k[j] * g[j]; // alternate polarity: adjacent bands sum without notches
    }
    this.out[0] = this.out[1] = y;
  }
}
Ffb914.params = Array.from({ length: 14 }, (_, i) => 'g' + i);
Ffb914.ins = ['in']; Ffb914.outs = ['o1', 'o2'];

// ---------------------------------------------------------------- CP3A mixer
// Discrete transistor summing stage. Unity around "5", x2 at "10"; clips softly and
// asymmetrically when pushed (the classic CP3 overdrive). DC coupled.
class MixCp3a extends Mod {
  ctl() { const p = this.p; this.g0 = p[0] * 0.2; this.g1 = p[1] * 0.2; this.g2 = p[2] * 0.2; this.g3 = p[3] * 0.2; this.gm = p[4] * 0.1; }
  tick() {
    const i = this.in;
    const x = i[0] * this.g0 + i[1] * this.g1 + i[2] * this.g2 + i[3] * this.g3;
    const y = (x >= 0 ? 4 * Math.tanh(x * 0.25) : 3 * Math.tanh(x * (1 / 3))) * this.gm;
    this.out[0] = y; this.out[1] = -y;
  }
}
MixCp3a.params = ['l1', 'l2', 'l3', 'l4', 'master'];
MixCp3a.ins = ['i1', 'i2', 'i3', 'i4'];
MixCp3a.outs = ['pos', 'neg'];

class Att995 extends Mod {
  tick() { const i = this.in, p = this.p, o = this.out; o[0] = i[0] * p[0] * 0.1; o[1] = i[1] * p[1] * 0.1; o[2] = i[2] * p[2] * 0.1; }
}
Att995.params = ['a1', 'a2', 'a3']; Att995.ins = ['i1', 'i2', 'i3']; Att995.outs = ['o1', 'o2', 'o3'];

// ---------------------------------------------------------------- 960 sequential controller
// params: 0-23 knobs (rows A,B,C x 8), 24-31 stage mode (0 skip,1 normal,2 stop), 32-39 set buttons,
// 40 9th stage (0 skip,1 stop), 41-43 row range (x1,x2,x4), 44 3rd row timing, 45 osc range, 46 vernier,
// 47 on, 48 off, 49 shift
const SEQ_BASE = [0.1, 0.4, 1.6, 6.4, 25.6, 102.4];
class Seq960 extends Mod {
  constructor(fs) {
    super(fs);
    this.stage = 0; this.running = false; this.phase = 0; this.pulse = 0; this.fb = 1;
    this.pb = new Uint8Array(11); // previous button states: on, off, shift, set1..8
    this.pi = new Uint8Array(11); // previous trigger-input states
  }
  ctl() { this.fb = SEQ_BASE[this.p[45] | 0] * exp2((this.p[46] - 5) * 0.4); }
  advance() {
    const p = this.p;
    let s = this.stage;
    for (let n = 0; n < 9; n++) {
      s = (s + 1) % 9;
      if (s === 8) { if (p[40] < 0.5) continue; this.stage = 8; this.running = false; return; }
      const md = p[24 + s];
      if (md === 0) continue;
      this.stage = s;
      if (md === 2) this.running = false;
      return;
    }
  }
  tick() {
    const p = this.p, i = this.in, o = this.out, pb = this.pb, pi = this.pi;
    let e;
    // front-panel buttons and trigger inputs (rising edges)
    for (let k = 0; k < 11; k++) {
      const b = p[k < 3 ? 47 + k : 29 + k] > 0.5 ? 1 : 0;
      const t = i[k < 3 ? 1 + k : 1 + k] > 1.5 ? 1 : 0;
      e = (b && !pb[k]) || (t && !pi[k]);
      pb[k] = b; pi[k] = t;
      if (!e) continue;
      if (k === 0) { if (!this.running) { this.running = true; this.phase = 0; if (this.stage === 8) this.advance(), this.running = true; } }
      else if (k === 1) this.running = false;
      else if (k === 2) { this.advance(); this.pulse = this.fs * 0.03; }
      else { this.stage = k - 3; this.pulse = this.fs * 0.03; }
    }
    const st = this.stage;
    if (this.running) {
      let f = this.fb;
      if (this.ic[0]) f *= exp2(i[0]);
      if (p[44] > 0.5 && st < 8) f *= exp2(p[16 + st] * 0.2 * (1 << p[43]) - 1);
      this.phase += f / this.fs;
      if (this.phase >= 1) { this.phase -= 1; if (this.phase >= 1) this.phase = 0; this.advance(); }
    }
    if (this.pulse > 0) this.pulse--;
    const hi = this.running ? this.phase < 0.5 : this.pulse > 0;
    const s2 = this.stage;
    if (s2 < 8) {
      o[0] = o[1] = p[s2] * 0.2 * (1 << p[41]);
      o[2] = o[3] = p[8 + s2] * 0.2 * (1 << p[42]);
      o[4] = o[5] = p[16 + s2] * 0.2 * (1 << p[43]);
    } else { o[0] = o[1] = o[2] = o[3] = o[4] = o[5] = 0; }
    o[6] = this.running && this.phase < 0.5 ? 5 : 0;
    for (let k = 0; k < 8; k++) o[7 + k] = (k === s2 && hi) ? 5 : 0;
  }
  state() { return [this.stage, this.running ? 1 : 0]; }
}
Seq960.params = [
  ...[...'abc'].flatMap((r) => Array.from({ length: 8 }, (_, i) => r + (i + 1))),
  ...Array.from({ length: 8 }, (_, i) => 'm' + (i + 1)),
  ...Array.from({ length: 8 }, (_, i) => 'set' + (i + 1)),
  'm9', 'rngA', 'rngB', 'rngC', 'timing', 'frange', 'fvern', 'on', 'off', 'shift'];
Seq960.ins = ['ctl', 'on', 'off', 'shift', ...Array.from({ length: 8 }, (_, i) => 't' + (i + 1))];
Seq960.outs = ['outA1', 'outA2', 'outB1', 'outB2', 'outC1', 'outC2', 'clk', ...Array.from({ length: 8 }, (_, i) => 'g' + (i + 1))];
Seq960.always = true;

// 962 sequential switch: each shift trigger selects the next input (2 stages unless input 3 is patched).
class Sw962 extends Mod {
  constructor(fs) { super(fs); this.stage = 0; this.pt_ = 0; }
  tick() {
    const i = this.in, t = i[0] > 1.5 ? 1 : 0;
    if (t && !this.pt_) this.stage = (this.stage + 1) % (this.ic[3] ? 3 : 2);
    this.pt_ = t;
    this.out[0] = i[1 + this.stage];
  }
  state() { return [this.stage]; }
}
Sw962.params = []; Sw962.ins = ['shift', 's1', 's2', 's3']; Sw962.outs = ['out'];
Sw962.always = true;

// 961 interface: V-trigger <-> S-trigger conversion.
class Ifc961 extends Mod {
  tick() { const i = this.in, o = this.out; o[0] = i[0] > 1.5 ? 1 : 0; o[1] = i[1] > 1.5 ? 1 : 0; o[2] = i[2] > 0.5 ? 5 : 0; }
}
Ifc961.params = []; Ifc961.ins = ['va', 'vb', 's']; Ifc961.outs = ['sa', 'sb', 'v'];

// ---------------------------------------------------------------- keyboard controller (950-style) + MIDI CVs
// Monophonic, single trigger, selectable note priority, pitch is held after release, RC portamento.
class Kbd extends Mod {
  constructor(fs) {
    super(fs);
    this.held = []; this.target = 1; this.pitch = 1; this.gate = 0; this.vel = 0;
    this.bend = 0; this.mod = 0; this.at = 0; this.sb = 0; this.sm = 0; this.sa = 0; this.kg = 1;
  }
  ctl() {
    const v = this.p[0];
    this.kg = v < 0.05 ? 1 : 1 - Math.exp(-1 / (0.004 * Math.pow(500, v / 10) * this.fs));
  }
  pick() {
    const h = this.held;
    if (!h.length) { this.gate = 0; return; }
    const pr = this.p[1];
    let n = h[h.length - 1][0];
    if (pr === 0) n = Math.min(...h.map((x) => x[0])); else if (pr === 2) n = Math.max(...h.map((x) => x[0]));
    this.target = (n - 36) / 12;
    this.gate = 1;
  }
  noteOn(n, vel) {
    this.held = this.held.filter((x) => x[0] !== n);
    this.held.push([n, vel]);
    if (!this.gate) this.vel = vel;
    this.pick();
  }
  noteOff(n) { this.held = this.held.filter((x) => x[0] !== n); this.pick(); }
  allOff() { this.held = []; this.gate = 0; }
  tick() {
    const o = this.out;
    this.pitch += (this.target - this.pitch) * this.kg;
    this.sb += (this.bend - this.sb) * 0.002; this.sm += (this.mod - this.sm) * 0.002; this.sa += (this.at - this.sa) * 0.002;
    o[0] = this.pitch;
    o[1] = this.vel * 5; o[2] = this.sb * this.p[2] * 0.1; o[3] = this.sm * 5; o[4] = this.sa * 5;
    o[5] = this.gate * 5; o[6] = o[7] = o[8] = this.gate;
  }
  state() { return [this.gate]; }
}
Kbd.params = ['glide', 'prio', 'bend'];
Kbd.ins = [];
Kbd.outs = ['pitch', 'vel', 'bendo', 'mod', 'at', 'vtrig', 'strig1', 'strig2', 'strig3'];
Kbd.always = true;

// Second, compact MIDI voice (its own MIDI channel): pitch, velocity and triggers only.
class KbdB extends Kbd {
  tick() {
    const o = this.out;
    this.pitch += (this.target - this.pitch) * this.kg;
    o[0] = this.pitch; o[1] = this.vel * 5; o[2] = this.gate * 5; o[3] = o[4] = this.gate;
  }
}
KbdB.params = ['glide', 'prio'];
KbdB.ins = [];
KbdB.outs = ['pitch', 'vel', 'vtrig', 'strig1', 'strig2'];
KbdB.always = true;

// ---------------------------------------------------------------- output
class Out extends Mod {
  constructor(fs) { super(fs); this.L = 0; this.R = 0; this.peak = 0; this.g = 0; }
  ctl() { const v = this.p[0] * 0.1; this.g = v * v * 1.2; }
  tick() {
    const i = this.in, ic = this.ic;
    let l = ic[0] ? i[0] : i[1], r = ic[1] ? i[1] : i[0];
    l *= this.g; r *= this.g;
    const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
    if (al > 0.6) l = (l < 0 ? -1 : 1) * (0.6 + 0.4 * Math.tanh((al - 0.6) * 2.5));
    if (ar > 0.6) r = (r < 0 ? -1 : 1) * (0.6 + 0.4 * Math.tanh((ar - 0.6) * 2.5));
    this.L = l; this.R = r;
    const m = al > ar ? al : ar;
    if (m > this.peak) this.peak = m;
  }
  state() { const v = this.peak; this.peak = 0; return [v]; }
}
Out.params = ['level']; Out.ins = ['l', 'r']; Out.outs = [];
Out.always = true;

// ---------------------------------------------------------------- effect pedals
// Analog-style echo: interpolated delay line whose length is slewed (pitch bends when TIME moves, like a
// BBD/tape unit), dark and softly saturating repeats that can run away into self-oscillation.
class FxEcho extends Mod {
  constructor(fs) { super(fs); this.N = 1 << 18; this.buf = new Float32Array(this.N); this.w = 0; this.d = fs * 0.3; this.lp = 0; }
  ctl() {
    const p = this.p, fs = this.fs;
    this.dt = fs * 0.02 * Math.pow(50, p[0] * 0.1); // 20 ms – 1 s
    this.fb = p[1] * 0.11; this.mix = p[2] * 0.14;
    this.k = 1 - Math.exp(-2 * Math.PI * 3200 / fs); this.ks = 1 - Math.exp(-1 / (0.08 * fs));
  }
  tick() {
    const i = this.in, N = this.N, b = this.buf, x = i[0];
    let tg = this.dt; if (this.ic[1]) tg *= exp2(i[1]);
    tg = clamp(tg, 96, N - 4);
    this.d += (tg - this.d) * this.ks;
    let r = this.w - this.d; if (r < 0) r += N;
    const r0 = r | 0, y = b[r0] + (b[(r0 + 1) & (N - 1)] - b[r0]) * (r - r0);
    this.lp += (y - this.lp) * this.k;
    const wet = this.lp, on = this.p[3] > 0.5;
    b[this.w] = 3 * Math.tanh(((on ? x : 0) + wet * this.fb) * (1 / 3));
    this.w = (this.w + 1) & (N - 1);
    this.out[0] = on ? x + wet * this.mix : x;
  }
}
FxEcho.params = ['time', 'fb', 'mix', 'on']; FxEcho.ins = ['in', 'cv']; FxEcho.outs = ['out'];

// BBD-style flanger: 0.25–9 ms delay swept by a triangle LFO, regeneration, fixed 50/50 mix.
class FxFlanger extends Mod {
  constructor(fs) { super(fs); this.N = 4096; this.buf = new Float32Array(this.N); this.w = 0; this.ph = 0; }
  ctl() { const p = this.p; this.inc = 0.05 * Math.pow(160, p[0] * 0.1) / this.fs; this.depth = p[1] * 0.05; this.man = p[2] * 0.1; this.fb = p[3] * 0.092; }
  tick() {
    const N = this.N, b = this.buf, x = this.in[0];
    let ph = this.ph + this.inc; if (ph >= 1) ph -= 1; this.ph = ph;
    const pos = clamp(this.man + this.depth * (1 - 4 * (ph < 0.5 ? 0.5 - ph : ph - 0.5)), 0, 1);
    let r = this.w - this.fs * 0.00025 * Math.pow(36, pos); if (r < 0) r += N;
    const r0 = r | 0, wet = b[r0] + (b[(r0 + 1) & (N - 1)] - b[r0]) * (r - r0);
    b[this.w] = x + 2 * Math.tanh(wet * this.fb * 0.5);
    this.w = (this.w + 1) & (N - 1);
    this.out[0] = this.p[4] > 0.5 ? (x + wet) * 0.72 : x;
  }
}
FxFlanger.params = ['rate', 'depth', 'manual', 'fb', 'on']; FxFlanger.ins = ['in']; FxFlanger.outs = ['out'];

// Stereo reverb (Schroeder/Moorer network: 8 damped combs + 4 allpasses per side), computed at half the engine rate.
const RV_COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], RV_AP = [556, 441, 341, 225];
class FxReverb extends Mod {
  constructor(fs) {
    super(fs);
    const sc = fs / 2 / 44100, mk = (len, spread) => len.map((n) => new Float32Array(Math.round((n + spread) * sc)));
    this.cb = [mk(RV_COMB, 0), mk(RV_COMB, 23)]; this.ab = [mk(RV_AP, 0), mk(RV_AP, 23)];
    this.ci = [new Int32Array(8), new Int32Array(8)]; this.ai = [new Int32Array(4), new Int32Array(4)];
    this.fs_ = [new Float64Array(8), new Float64Array(8)];
    this.acc = 0; this.half = 0; this.wl = 0; this.wr = 0;
  }
  ctl() { const p = this.p; this.room = 0.72 + p[0] * 0.0265; this.damp = 0.75 - p[1] * 0.07; this.mix = p[2] * 0.1; }
  side(s, inp) {
    const cb = this.cb[s], ci = this.ci[s], st = this.fs_[s], ab = this.ab[s], ai = this.ai[s], room = this.room, damp = this.damp;
    let sum = 0;
    for (let k = 0; k < 8; k++) {
      const b = cb[k], j = ci[k], y = b[j];
      let f = y * (1 - damp) + st[k] * damp;
      if (f < 1e-15 && f > -1e-15) f = 0;
      st[k] = f; b[j] = inp + f * room; ci[k] = j + 1 === b.length ? 0 : j + 1;
      sum += y;
    }
    for (let k = 0; k < 4; k++) {
      const b = ab[k], j = ai[k], bo = b[j];
      b[j] = sum + bo * 0.5; sum = bo - sum; ai[k] = j + 1 === b.length ? 0 : j + 1;
    }
    return sum;
  }
  tick() {
    const x = this.in[0], on = this.p[3] > 0.5, o = this.out;
    this.acc += on ? x : 0;
    if ((this.half ^= 1) === 0) { const inp = this.acc * 0.5 * RV_GAIN; this.acc = 0; this.wl = this.side(0, inp); this.wr = this.side(1, inp); }
    if (!on) { o[0] = o[1] = x; return; }
    const m = this.mix, dry = m < 0.5 ? 1 : 2 * (1 - m), wet = m < 0.5 ? 2 * m : 1;
    o[0] = x * dry + this.wl * wet; o[1] = x * dry + this.wr * wet;
  }
}
const RV_GAIN = 0.045;
FxReverb.params = ['decay', 'tone', 'mix', 'on']; FxReverb.ins = ['in']; FxReverb.outs = ['l', 'r'];

export const CLASSES = {
  fxecho: FxEcho, fxflanger: FxFlanger, fxreverb: FxReverb,
  vco921: Vco921, drv921a: Drv921a, osc921b: Osc921b, lpf904a: Lpf904a, hpf904b: Hpf904b,
  vca902: Vca902, eg911: Eg911, dly911a: Dly911a, noise903a: Noise903a, ffb914: Ffb914,
  mix: MixCp3a, att995: Att995, seq960: Seq960, sw962: Sw962, ifc961: Ifc961, kbd: Kbd, kbd2: KbdB, out: Out,
};

// ---------------------------------------------------------------- 2x decimator (Kaiser windowed half-band)
class Decim2 {
  constructor() {
    const N = 63, c = (N - 1) / 2, beta = 8;
    const i0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 25; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    this.h = new Float64Array(N);
    let sum = 0;
    for (let n = 0; n < N; n++) {
      const m = n - c, s = m === 0 ? 0.5 : Math.sin(Math.PI * m * 0.5) / (Math.PI * m);
      this.h[n] = s * i0(beta * Math.sqrt(1 - (m / c) * (m / c))) / i0(beta);
      sum += this.h[n];
    }
    for (let n = 0; n < N; n++) this.h[n] /= sum;
    this.N = N; this.buf = new Float64Array(64); this.pos = 0;
  }
  push(x) { this.buf[this.pos] = x; this.pos = (this.pos + 1) & 63; }
  get() {
    const h = this.h, b = this.buf;
    let y = 0, j = this.pos;
    for (let n = this.N - 1; n >= 0; n--) { j = (j - 1) & 63; y += h[n] * b[j]; }
    return y;
  }
}

// ---------------------------------------------------------------- engine
export class Engine {
  // system: [{id, type}]
  constructor(sampleRate, system) {
    this.fs = sampleRate * 2;
    this.mods = {};
    this.list = [];
    for (const s of system) {
      const C = CLASSES[s.type];
      if (!C) continue; // passive / UI-only modules (multiples, blanks)
      const m = new C(this.fs);
      m.id = s.id;
      this.mods[s.id] = m; this.list.push(m);
    }
    this.kbds = this.list.filter((m) => m instanceof Kbd); // [voice A, voice B]
    this.kbd = this.kbds[0];
    this.outMod = this.list.find((m) => m instanceof Out);
    this.order = [];
    this.cnt = 0;
    this.ks = 1 - Math.exp(-16 / (this.fs * 0.006));
    this.dl = new Decim2(); this.dr = new Decim2();
    this.setPatch([]);
  }
  setParam(id, name, v, jump) {
    const m = this.mods[id]; if (!m) return;
    const k = m.constructor.params.indexOf(name); if (k < 0) return;
    m.pt[k] = v;
    if (jump) { m.p[k] = v; m.ctl(); }
  }
  // wires: [{f:[id,out], t:[id,in], g}]
  setPatch(wires) {
    for (const m of this.list) { m.ic.fill(0); m.oc.fill(0); m.wSrc = []; m.wSi = []; m.wDi = []; m.wG = []; m.deps = []; }
    for (const w of wires) {
      const s = this.mods[w.f[0]], d = this.mods[w.t[0]];
      if (!s || !d) continue;
      const si = s.constructor.outs.indexOf(w.f[1]), di = d.constructor.ins.indexOf(w.t[1]);
      if (si < 0 || di < 0) continue;
      s.oc[si] = 1; d.ic[di] = 1;
      d.wSrc.push(s.out); d.wSi.push(si); d.wDi.push(di); d.wG.push(w.g == null ? 1 : w.g);
      if (!d.deps.includes(s)) d.deps.push(s);
    }
    const order = [], seen = new Set();
    const visit = (m) => { if (seen.has(m)) return; seen.add(m); for (const d of m.deps) visit(d); order.push(m); };
    for (const m of this.list) if (m.constructor.always) visit(m);
    for (const m of this.list) {
      m.zero = [...new Set(m.wDi)];
      m.in.fill(0);
      if (!seen.has(m)) m.out.fill(0);
      m.ctl();
    }
    this.order = order;
  }
  noteOn(n, v, k = 0) { const kb = this.kbds[k]; kb && kb.noteOn(n, v); }
  noteOff(n, k = 0) { const kb = this.kbds[k]; kb && kb.noteOff(n); }
  allOff() { for (const kb of this.kbds) kb.allOff(); }
  ctl(kind, v) { const k = this.kbd; if (!k) return; if (kind === 'bend') k.bend = v; else if (kind === 'mod') k.mod = v; else if (kind === 'at') k.at = v; }
  tick() {
    const order = this.order, n = order.length;
    if ((this.cnt++ & 15) === 0) {
      const ks = this.ks;
      for (let a = 0; a < n; a++) {
        const m = order[a], p = m.p, pt = m.pt;
        for (let k = 0; k < p.length; k++) { const d = pt[k] - p[k]; if (d !== 0) p[k] = (d < 1e-6 && d > -1e-6) ? pt[k] : p[k] + d * ks; }
        m.ctl();
      }
    }
    for (let a = 0; a < n; a++) {
      const m = order[a], inp = m.in, z = m.zero, wS = m.wSrc, wSi = m.wSi, wDi = m.wDi, wG = m.wG;
      for (let k = 0; k < z.length; k++) inp[z[k]] = 0;
      for (let k = 0; k < wS.length; k++) inp[wDi[k]] += wS[k][wSi[k]] * wG[k];
      m.tick();
    }
  }
  process(L, R) {
    const o = this.outMod, dl = this.dl, dr = this.dr;
    for (let s = 0; s < L.length; s++) {
      this.tick(); dl.push(o.L); dr.push(o.R);
      this.tick(); dl.push(o.L); dr.push(o.R);
      let l = dl.get(), r = dr.get();
      if (!(l === l) || !(r === r)) { l = 0; r = 0; } // never emit NaN
      L[s] = l; R[s] = r;
    }
  }
  state() {
    const st = {};
    for (const m of this.order) { const s = m.state(); if (s) st[m.id] = s; }
    return st;
  }
}
