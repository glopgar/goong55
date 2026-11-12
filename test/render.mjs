// Offline sanity tests: node test/render.mjs
import { Engine, CLASSES } from '../dsp/engine.js';
import { SYSTEM, TYPES, controlsOf, jacksOf, defaultParams, compileWires, isStepped, typeOf } from '../js/defs.js';
import { FACTORY } from '../js/presets.js';

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('  FAIL', msg); } };

// 1. panel definitions must match the DSP classes
for (const [type, def] of Object.entries(TYPES)) {
  const C = CLASSES[type];
  if (!C) continue;
  for (const c of controlsOf(type)) ok(C.params.includes(c.id), `${type}: param ${c.id} missing in DSP`);
  for (const p of C.params) ok(controlsOf(type).some((c) => c.id === p), `${type}: DSP param ${p} has no control`);
  for (const j of jacksOf(type)) ok((j.dir === 'in' ? C.ins : C.outs).includes(j.id), `${type}: jack ${j.id} missing in DSP`);
  for (const j of [...C.ins]) ok(jacksOf(type).some((x) => x.id === j && x.dir === 'in'), `${type}: DSP in ${j} has no jack`);
  for (const j of [...C.outs]) ok(jacksOf(type).some((x) => x.id === j && x.dir === 'out'), `${type}: DSP out ${j} has no jack`);
}

const SR = 48000;
function load(preset) {
  const en = new Engine(SR, SYSTEM);
  const params = defaultParams();
  for (const [m, o] of Object.entries(preset.params)) {
    ok(params[m], `preset ${preset.name}: unknown module ${m}`);
    for (const k of Object.keys(o)) ok(k in params[m], `preset ${preset.name}: unknown param ${m}.${k}`);
    Object.assign(params[m], o);
  }
  for (const [m, o] of Object.entries(params)) for (const [k, v] of Object.entries(o)) en.setParam(m, k, v, true);
  for (const [a, b] of preset.cables) for (const r of [a, b]) {
    const [m, j] = r.split('.');
    ok(jacksOf(typeOf[m] || 'blank').some((x) => x.id === j), `preset ${preset.name}: unknown jack ${r}`);
  }
  en.setPatch(compileWires(preset.cables.map(([a, b]) => ({ a, b }))));
  for (const p of preset.press || []) { const [m, k] = p.split('.'); en.setParam(m, k, 1, true); }
  return en;
}
function render(en, secs) {
  const n = Math.round(secs * SR), L = new Float32Array(n), R = new Float32Array(n);
  const B = 128;
  for (let i = 0; i + B <= n; i += B) en.process(L.subarray(i, i + B), R.subarray(i, i + B));
  return L;
}
const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
// fundamental estimate by autocorrelation
function pitch(x, a, n = 8192) {
  let best = 0, bl = 0;
  for (let lag = 16; lag < 2000; lag++) {
    let s = 0; for (let i = 0; i < n; i++) s += x[a + i] * x[a + i + lag];
    if (s > best * 1.02) { best = s; bl = lag; }
  }
  return SR / bl;
}

for (const preset of FACTORY) {
  const en = load(preset);
  en.noteOn(48, 0.8);
  const t0 = performance.now();
  const x = render(en, 3);
  const dt = (performance.now() - t0) / 3000;
  en.noteOff(48);
  const tail = render(en, 3);
  const nan = x.some((v) => v !== v);
  console.log(`${preset.name.slice(0, 46).padEnd(46)} rms ${rms(x, 0, 3 * SR).toFixed(3)} peak ${peak(x).toFixed(3)} ` +
    `f≈${pitch(x, SR).toFixed(1)}Hz tail ${rms(tail, 2 * SR, 3 * SR).toFixed(4)} cpu ${(dt * 100).toFixed(1)}% active ${en.order.length}`);
  ok(!nan, 'NaN in output');
  if (preset.cables.length) ok(rms(x, 0, 3 * SR) > 0.01, `${preset.name}: silent`);
  ok(peak(x) <= 1.0, `${preset.name}: clipping`);
}

// 2. tuning: one 921B saw straight to the output, A (MIDI 57) on 8' should be 220 Hz
{
  const en = load({ name: 'tune', params: { out: { level: 10 } }, cables: [['kbd.pitch', 'drv1.f1'], ['o1a.saw', 'out.l']] });
  en.noteOn(57, 1);
  const x = render(en, 1);
  const f = pitch(x, 20000, 16384);
  console.log('tuning A3 on 8\':', f.toFixed(2), 'Hz');
  ok(Math.abs(f - 220) < 1.5, 'tuning off');
}
// 3. filter self-oscillation tracks 1 V/oct: regeneration at 10, no input
{
  for (const [note, want] of [[36, 320], [48, 640], [60, 1280]]) {
    const en = load({ name: 'selfosc', params: { lpf: { regen: 10, freq: 0 }, out: { level: 10 } }, cables: [['kbd.pitch', 'lpf.c1'], ['lpf.out', 'out.l']] });
    en.noteOn(note, 1);
    const x = render(en, 1.5);
    const f = pitch(x, 40000, 16384);
    console.log(`904A self-oscillation, ${(note - 36) / 12} V: ${f.toFixed(1)} Hz (nominal ${want}) rms ${rms(x, 40000).toFixed(3)}`);
    ok(Math.abs(f / want - 1) < 0.04, 'ladder tracking off');
  }
}
// 4. envelope timing: T1 at 5 -> ~141 ms to peak
{
  const en = load({ name: 'env', params: { eg1: { t1: 5, t2: 10, es: 10, t3: 5 } }, cables: [['kbd.strig1', 'eg1.trig']] });
  // eg1 is not reachable from the output, so tick it directly
  const eg = en.mods.eg1; let n = 0;
  eg.ctl(); eg.in[0] = 1;
  while (eg.out[0] < 5.49 && n < 1e6) { eg.tick(); n++; }
  console.log('911 attack at T1=5:', (n / en.fs * 1000).toFixed(1), 'ms, peak', eg.out[0].toFixed(2), 'V');
  ok(Math.abs(n / en.fs - 0.1414) < 0.01, 'attack time off');
}
// 5. sequencer steps
{
  const en = load(FACTORY.find((p) => p.press));
  const seen = new Set();
  for (let i = 0; i < 40; i++) { render(en, 0.05); seen.add(en.mods.seq.stage); }
  console.log('960 stages visited:', [...seen].sort().join(','));
  ok(seen.size === 8, 'sequencer did not visit 8 stages');
}
// 6. multiples: one source to three destinations
{
  const w = compileWires([{ a: 'kbd.pitch', b: 'mult1.a1' }, { a: 'mult1.a2', b: 'drv1.f1' }, { a: 'mult1.a3', b: 'lpf.c1' }]);
  const ext = w.filter((x) => x.f[0] === 'kbd');
  ok(ext.length === 2 && ext.every((x) => x.g === 1), 'multiple resolution');
}
console.log(fail ? `\n${fail} FAILED` : '\nall ok');
process.exit(fail ? 1 : 0);
