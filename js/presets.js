// Factory patches. params are overrides on top of the panel defaults; cables are [from, to] jack refs.
// press: buttons pulsed after loading (e.g. start the 960).
const ST = 1 / 2.4; // sequencer knob units per semitone on the X1 range (0.2 V per unit)
const notes = (row, semis) => Object.fromEntries(semis.map((s, i) => [row + (i + 1), s * ST]));
const vals = (row, v) => Object.fromEntries(v.map((x, i) => [row + (i + 1), x]));
const tempo = (hz) => ({ frange: 3, fvern: 5 + Math.log2(hz / 6.4) / 0.4 }); // steps per second, 1.6–25 Hz
// vibrato / slow LFO from the second 921: "LO" range, octave scale -> 0.128 Hz * 2^(freq/2)
const lfo = (hz) => ({ lo: 1, scale: 1, freq: 2 * Math.log2(hz / 0.128) });

export const CATS = ['Secuencias (960)', 'Con pedales de efectos', 'Bajos y solistas', 'Teclados y conjuntos', 'Efectos y percusión', 'Básicos'];
const SEQ = CATS[0], PED = CATS[1], LEAD = CATS[2], KEYS = CATS[3], FX = CATS[4];

// Keyboard pitch to both oscillator banks and the filter; bank 1 mixer -> 904A -> VCA 1 -> output; EG1 = loudness, EG2 = filter.
const PITCH = [['kbd.pitch', 'mult1.a1'], ['mult1.a2', 'drv1.f1'], ['mult1.a3', 'lpf.c1'], ['mult1.a4', 'drv2.f1']];
const CHAIN = [['mix1.pos', 'lpf.in'], ['lpf.out', 'vca1.sigp'], ['eg1.o1', 'vca1.c1'], ['eg2.o1', 'att.i1'], ['att.o1', 'lpf.c2']];
const VOICE = [...PITCH, ...CHAIN, ['vca1.outp', 'out.l']];
const KBD_TRIG = [['kbd.strig1', 'eg1.trig'], ['kbd.strig2', 'eg2.trig']];
// The 960 clock is a V-trigger: the 961 turns it into the S-triggers the envelopes need.
const SEQ_TRIG = [['seq.clk', 'mult2.a1'], ['mult2.a2', 'ifc.va'], ['mult2.a3', 'ifc.vb'], ['ifc.sa', 'eg1.trig'], ['ifc.sb', 'eg2.trig']];
// Same, but both envelopes from one 961 channel (through the 911A in parallel mode), leaving the other free.
const SEQ_TRIG1 = [['ifc.sa', 'dly.in1'], ['dly.o1', 'eg1.trig'], ['dly.o2', 'eg2.trig']];
const DLY = { mode: 1, t1: 0, t2: 0 };
const osc = (...list) => list.map((o, i) => [o, `mix1.i${i + 1}`]);
const PLUCK = { eg1: { t1: 0.3, t2: 5, es: 0, t3: 3 }, eg2: { t1: 0.2, t2: 4.3, es: 0, t3: 3 } };

export const FACTORY = [
  // ------------------------------------------------------------------ bass / lead (first = default patch)
  {
    cat: LEAD, name: 'Bajo clásico · 3 osciladores',
    params: {
      kbd: { prio: 1 },
      o1a: { range: 1 }, o1b: { range: 1, freq: 0.09 }, o1c: { range: 0, freq: -0.05 },
      lpf: { freq: -2, regen: 3 }, att: { a1: 6 },
      eg1: { t1: 0.5, t2: 6, es: 8, t3: 4.5 }, eg2: { t1: 0.3, t2: 6, es: 3, t3: 4.5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o1b.saw', 'o1c.rect')],
  },
  {
    cat: LEAD, name: 'Bajo redondo de triángulo',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1c: { range: 0 }, mix1: { l1: 7, l2: 3 },
      lpf: { freq: -1, regen: 0 }, att: { a1: 3 },
      eg1: { t1: 0.3, t2: 5.5, es: 6, t3: 3.5 }, eg2: { t1: 0.2, t2: 5, es: 2, t3: 3.5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.tri', 'o1c.rect')],
  },
  {
    cat: LEAD, name: 'Solista con portamento y vibrato',
    params: {
      kbd: { prio: 1, glide: 4 }, o1b: { freq: 0.06 },
      lpf: { freq: 1, regen: 2 }, att: { a1: 3, a2: 0.15 },
      eg1: { t1: 1, t2: 6, es: 8, t3: 4 }, eg2: { t1: 2, t2: 6, es: 5, t3: 4 },
      vco2: lfo(5.4),
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['vco2.sine', 'att.i2'], ['att.o2', 'drv1.f2']],
  },
  {
    cat: LEAD, name: 'Sync lead',
    params: {
      kbd: { prio: 1, glide: 3 },
      o2a: { syncm: 2 }, drv2: { freq: 7 },
      lpf: { freq: 2, regen: 1 }, att: { a1: 4.5 },
      eg1: { t1: 0.5, t2: 6, es: 8, t3: 4 }, eg2: { t1: 0, t2: 7.5, es: 2, t3: 5 },
    },
    cables: [...PITCH.slice(0, 2), ['mult1.a3', 'drv2.f1'], ['mult1.a4', 'lpf.c1'], ['mix1.pos', 'lpf.in'], ['lpf.out', 'vca1.sigp'], ['vca1.outp', 'out.l'],
      ['eg1.o1', 'vca1.c1'], ['eg2.o1', 'att.i1'], ['att.o1', 'drv2.f2'], ...KBD_TRIG,
      ['o1a.rect', 'o2a.sync'], ['o2a.saw', 'mix1.i1']],
  },
  {
    cat: LEAD, name: 'Solista en quintas paralelas',
    params: {
      kbd: { prio: 1, glide: 2.5 }, drv2: { freq: 7 }, o1b: { freq: 0.07 }, mix1: { l3: 3.5 },
      lpf: { freq: 0.5, regen: 3 }, att: { a1: 4 },
      eg1: { t1: 0.5, t2: 6, es: 8, t3: 4 }, eg2: { t1: 0.5, t2: 6, es: 4, t3: 4 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o2a.saw', 'o1b.rect')],
  },
  {
    cat: LEAD, name: 'Metales',
    params: {
      kbd: { prio: 1 }, o1b: { freq: 0.08 }, o1c: { freq: -0.07 },
      lpf: { freq: -1.5, regen: 1.5 }, att: { a1: 5.5 },
      eg1: { t1: 3, t2: 6, es: 9, t3: 4.5 }, eg2: { t1: 4.5, t2: 6, es: 6, t3: 4.5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o1b.saw', 'o1c.saw')],
  },

  // ------------------------------------------------------------------ sequences
  {
    cat: SEQ, name: 'Berlín · ostinato de 8 pasos',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.1 }, o1c: { range: 0 },
      lpf: { freq: -2.2, regen: 5.5 }, att: { a1: 5 }, ...PLUCK,
      seq: { rngA: 0, rngB: 0, ...tempo(7.3), ...notes('a', [0, 0, 12, 0, 7, 0, 10, 12]), ...vals('b', [5, 0, 3, 0, 8, 0, 2, 6]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect', 'o1c.saw'), ['seq.outA1', 'drv1.f2'], ['seq.outB1', 'lpf.c3']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Berlín · 16 pasos (el 962 alterna las filas A y B)',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.08 }, mix1: { l3: 0 },
      lpf: { freq: -1.8, regen: 4.5 }, att: { a1: 5.5 }, ...PLUCK,
      seq: { rngA: 0, rngB: 0, ...tempo(8), ...notes('a', [0, 0, 12, 0, 0, 10, 0, 12]), ...notes('b', [0, 0, 7, 0, 3, 0, 5, 7]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.saw'),
      ['seq.outA1', 'sw.s1'], ['seq.outB1', 'sw.s2'], ['sw.out', 'drv1.f2'], ['seq.g1', 'sw.shift']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Bajo en octavas · disco electrónico',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.08 }, mix1: { l3: 0 },
      lpf: { freq: -1.5, regen: 3 }, att: { a1: 6 },
      eg1: { t1: 0.2, t2: 4.5, es: 0, t3: 2.5 }, eg2: { t1: 0.1, t2: 3.8, es: 0, t3: 2.5 },
      seq: { rngA: 0, ...tempo(8.3), ...notes('a', [0, 12, 0, 12, 0, 12, 10, 12]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Secuencia rápida con barrido lento de filtro',
    params: {
      kbd: { prio: 1 }, o1b: { freq: 0.07 }, mix1: { l3: 0 },
      lpf: { freq: -1, regen: 6 }, att: { a1: 2.5 },
      eg1: { t1: 0.2, t2: 4, es: 0, t3: 2.5 }, eg2: { t1: 0.1, t2: 3.5, es: 0, t3: 2.5 },
      vco2: lfo(0.06),
      seq: { rngA: 0, ...tempo(11), ...notes('a', [0, 3, 5, 3, 10, 8, 10, 12]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2'], ['vco2.tri', 'lpf.c3']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Ritmo irregular (la 3ª fila controla el tiempo)',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.1 }, mix1: { l3: 0 },
      lpf: { freq: -1.6, regen: 4 }, att: { a1: 5 }, ...PLUCK,
      seq: { rngA: 0, rngC: 0, timing: 1, ...tempo(5), ...notes('a', [0, 7, 12, 10, 7, 3, 5, 0]), ...vals('c', [5, 5, 10, 10, 5, 10, 10, 5]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Secuencia tímbrica (tono, filtro y ancho de pulso por paso)',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.08 }, drv1: { width: 1 }, mix1: { l3: 0 },
      lpf: { freq: -1.8, regen: 4 }, att: { a1: 3.5 }, ...PLUCK,
      seq: { rngA: 0, rngB: 0, rngC: 1, ...tempo(6), ...notes('a', [0, 0, 7, 0, 12, 0, 7, 3]), ...vals('b', [2, 8, 0, 5, 9, 0, 6, 3]), ...vals('c', [0, 10, 3, 8, 1, 6, 10, 4]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.rect', 'o1b.rect'), ['seq.outA1', 'drv1.f2'], ['seq.outB1', 'lpf.c3'], ['seq.outC1', 'drv1.w1']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Secuencia en quintas paralelas',
    params: {
      kbd: { prio: 1 }, drv2: { freq: 7 }, o1b: { freq: 0.08 }, mix1: { l3: 3 },
      lpf: { freq: -1, regen: 3.5 }, att: { a1: 4.5 },
      eg1: { t1: 0.3, t2: 5.5, es: 2, t3: 3.5 }, eg2: { t1: 0.2, t2: 5, es: 1, t3: 3.5 },
      seq: { rngA: 0, ...tempo(5.5), ...notes('a', [0, 3, 7, 3, 10, 7, 3, 7]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o2a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2'], ['seq.outA2', 'drv2.f2']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Dúo secuenciado: bajo (fila A) y melodía (fila B)',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.08 }, mix1: { l3: 0 },
      o2a: { range: 3 }, drv2: { width: 3 }, mix2: { l2: 3 },
      lpf: { freq: -1.8, regen: 4 }, att: { a1: 5 }, ...PLUCK, eg3: { t1: 0.5, t2: 4.5, es: 3, t3: 4 }, dly: DLY,
      seq: { rngA: 0, rngB: 0, ...tempo(6.5), ...notes('a', [0, 0, 7, 0, 10, 0, 7, 12]), ...notes('b', [12, 15, 19, 24, 22, 19, 15, 10]) },
    },
    cables: [...PITCH, ...CHAIN, ...osc('o1a.saw', 'o1b.rect'),
      ['seq.outA1', 'drv1.f2'], ['seq.outB1', 'drv2.f2'],
      ['o2a.rect', 'hpf.in'], ['hpf.out', 'vca2.sigp'], ['eg3.o1', 'vca2.c1'],
      ['vca1.outp', 'mix2.i1'], ['vca2.outp', 'mix2.i2'], ['mix2.pos', 'out.l'],
      ['seq.clk', 'mult2.a1'], ['mult2.a2', 'ifc.va'], ['mult2.a3', 'ifc.vb'], ...SEQ_TRIG1, ['ifc.sb', 'eg3.trig']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Bajo y caja de ruido secuenciados',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 0 }, mix1: { l3: 0 },
      lpf: { freq: -1.6, regen: 4 }, att: { a1: 5.5 }, ...PLUCK, dly: DLY,
      hpf: { freq: 2, range: 1 }, eg3: { t1: 0, t2: 3.6, es: 0, t3: 3.6 }, mix2: { l2: 6 },
      seq: { rngA: 0, ...tempo(7.5), ...notes('a', [0, 0, 12, 0, 0, 7, 10, 0]) },
    },
    cables: [...PITCH, ...CHAIN, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2'],
      ['noise.w1', 'hpf.in'], ['hpf.out', 'vca2.sigp'], ['eg3.o1', 'vca2.c1'],
      ['vca1.outp', 'mix2.i1'], ['vca2.outp', 'mix2.i2'], ['mix2.pos', 'out.l'],
      ['seq.clk', 'ifc.va'], ...SEQ_TRIG1,
      ['seq.g3', 'mult3.a1'], ['seq.g7', 'mult3.a2'], ['mult3.a3', 'ifc.vb'], ['ifc.sb', 'eg3.trig']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Silbido secuenciado (904A auto-oscilando)',
    params: {
      kbd: { prio: 1 }, lpf: { freq: 0, regen: 10 }, out: { level: 8 },
      eg1: { t1: 2, t2: 5, es: 6, t3: 4.5 },
      seq: { rngA: 0, ...tempo(4), ...notes('a', [0, 7, 12, 7, 3, 7, 10, 7]) },
    },
    cables: [['seq.outA1', 'lpf.c1'], ['kbd.pitch', 'lpf.c2'], ['lpf.out', 'vca1.sigp'], ['vca1.outp', 'out.l'], ['eg1.o1', 'vca1.c1'],
      ['seq.clk', 'ifc.va'], ['ifc.sa', 'eg1.trig']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Secuencia lenta de campanas',
    params: {
      kbd: { prio: 1 }, o1b: { range: 3, freq: 0.05 }, drv2: { freq: 7 }, o2a: { range: 3 }, mix1: { l2: 3, l3: 2 },
      lpf: { freq: 3, regen: 0 }, att: { a1: 0 },
      eg1: { t1: 0.3, t2: 7.5, es: 0, t3: 7.5 },
      seq: { rngA: 0, ...tempo(1.8), ...notes('a', [0, 7, 12, 15, 19, 15, 12, 7]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.sine', 'o1b.sine', 'o2a.sine'), ['seq.outA1', 'drv1.f2'], ['seq.outA2', 'drv2.f2']],
    press: ['seq.on'],
  },
  {
    cat: SEQ, name: 'Frase de un disparo (cada tecla lanza la secuencia)',
    params: {
      kbd: { prio: 1 }, o1b: { freq: 0.08 }, mix1: { l3: 0 },
      lpf: { freq: 0, regen: 3 }, att: { a1: 4 },
      eg1: { t1: 0.3, t2: 5.5, es: 3, t3: 6.5 }, eg2: { t1: 0.2, t2: 5, es: 1, t3: 6 },
      seq: { rngA: 0, m8: 2, ...tempo(3.4), ...notes('a', [0, 3, 7, 10, 12, 15, 19, 24]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2'],
      ['kbd.vtrig', 'mult3.b1'], ['mult3.b2', 'seq.on'], ['mult3.b3', 'seq.t1']],
  },

  // ------------------------------------------------------------------ with effect pedals
  {
    cat: PED, name: 'Berlín con eco (tres pasos de retardo)',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1b: { range: 1, freq: 0.1 }, mix1: { l3: 0 },
      lpf: { freq: -2, regen: 5 }, att: { a1: 5 }, ...PLUCK,
      seq: { rngA: 0, ...tempo(7.3), ...notes('a', [0, 0, 12, 0, 7, 0, 10, 12]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['seq.outA1', 'drv1.f2'],],
    press: ['seq.on'],
  },
  {
    cat: PED, name: 'Solista con eco y reverb',
    params: {
      kbd: { prio: 1, glide: 3.5 }, o1b: { freq: 0.06 },
      lpf: { freq: 1, regen: 2.5 }, att: { a1: 3, a2: 0.15 },
      eg1: { t1: 1, t2: 6, es: 8, t3: 4.5 }, eg2: { t1: 2, t2: 6, es: 5, t3: 4.5 },
      vco2: lfo(5.4), out: { level: 5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o1b.rect'), ['vco2.sine', 'att.i2'], ['att.o2', 'drv1.f2'],],
  },
  {
    cat: PED, name: 'Cuerdas con flanger y reverb',
    params: {
      kbd: { prio: 1 }, o1b: { freq: 0.12 }, o1c: { freq: -0.1 },
      lpf: { freq: 1, regen: 0.5 }, att: { a1: 2 },
      eg1: { t1: 6, t2: 6, es: 8.5, t3: 6.5 }, eg2: { t1: 6.5, t2: 7, es: 6, t3: 6.5 },
      out: { level: 4.3 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.saw', 'o1b.saw', 'o1c.saw'),],
  },
  {
    cat: PED, name: 'Campanas lentas en una sala grande',
    params: {
      kbd: { prio: 1 }, o1b: { range: 3, freq: 0.05 }, drv2: { freq: 7 }, o2a: { range: 3 }, mix1: { l2: 3, l3: 2 },
      lpf: { freq: 3, regen: 0 }, att: { a1: 0 }, out: { level: 4 },
      eg1: { t1: 0.3, t2: 7, es: 0, t3: 7 },
      seq: { rngA: 0, ...tempo(1.8), ...notes('a', [0, 7, 12, 15, 19, 15, 12, 7]) },
    },
    cables: [...VOICE, ...SEQ_TRIG, ...osc('o1a.sine', 'o1b.sine', 'o2a.sine'), ['seq.outA1', 'drv1.f2'], ['seq.outA2', 'drv2.f2'],],
    press: ['seq.on'],
  },

  // ------------------------------------------------------------------ keys / ensembles
  {
    cat: KEYS, name: 'Cuerdas PWM',
    params: {
      kbd: { prio: 1 },
      o1b: { freq: 0.12 }, o1c: { freq: -0.1, range: 3 }, mix1: { l3: 2.5 },
      vco2: { lo: 1, freq: 9 }, mix2: { l1: 10 },
      lpf: { freq: 0.5, regen: 1 }, att: { a1: 2.5 },
      eg1: { t1: 6, t2: 6, es: 8.5, t3: 6.5 }, eg2: { t1: 6.5, t2: 7, es: 6, t3: 6.5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.rect', 'o1b.rect', 'o1c.saw'), ['vco2.tri', 'mix2.i1'], ['mix2.pos', 'drv1.w1']],
  },
  {
    cat: KEYS, name: 'Órgano de armónicos',
    params: {
      kbd: { prio: 1 }, o1a: { range: 1 }, o1c: { range: 3 }, drv2: { freq: 7 }, mix1: { l3: 3.5, l4: 2.5 },
      lpf: { freq: 4, regen: 0 }, att: { a1: 0 }, out: { level: 5 },
      eg1: { t1: 0.3, t2: 5, es: 10, t3: 1.5 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.sine', 'o1b.sine', 'o1c.sine', 'o2a.sine')],
  },
  {
    cat: KEYS, name: 'Clavecín',
    params: {
      kbd: { prio: 1 }, o1b: { range: 3 }, drv1: { width: 1.5 }, mix1: { l2: 3, l3: 0 },
      lpf: { freq: 2.5, regen: 1 }, att: { a1: 3 },
      eg1: { t1: 0, t2: 5.5, es: 0, t3: 4 }, eg2: { t1: 0, t2: 4.5, es: 0, t3: 4 },
    },
    cables: [...VOICE, ...KBD_TRIG, ...osc('o1a.rect', 'o1b.rect')],
  },
  {
    cat: KEYS, name: 'Flauta',
    params: {
      kbd: { prio: 1 }, mix1: { l1: 7, l4: 0.8 },
      lpf: { freq: 1, regen: 0 }, att: { a1: 1.5, a2: 0.12 },
      eg1: { t1: 4.5, t2: 6, es: 8.5, t3: 4.5 }, eg2: { t1: 4, t2: 6, es: 6, t3: 4.5 },
      vco2: lfo(5),
    },
    cables: [...VOICE, ...KBD_TRIG, ['o1a.tri', 'mix1.i1'], ['noise.p1', 'mix1.i4'], ['vco2.sine', 'att.i2'], ['att.o2', 'drv1.f2']],
  },
  {
    cat: KEYS, name: 'Campana FM',
    params: {
      kbd: { prio: 1 }, o1a: { freq: 6 }, mix2: { l1: 10 }, out: { level: 7 },
      eg1: { t1: 0, t2: 7.5, es: 0, t3: 7 }, eg2: { t1: 0, t2: 6.5, es: 0, t3: 6 },
    },
    cables: [['kbd.pitch', 'mult1.a1'], ['mult1.a2', 'drv1.f1'], ['mult1.a3', 'drv2.f1'], ...KBD_TRIG,
      ['o1a.sine', 'mix2.i1'], ['mix2.pos', 'vca2.sigp'], ['eg2.o1', 'vca2.c1'], ['vca2.outp', 'o2a.dc'],
      ['o2a.sine', 'vca1.sigp'], ['eg1.o1', 'vca1.c1'], ['vca1.outp', 'out.l']],
  },
  {
    cat: KEYS, name: 'Coro de formantes (914)',
    params: {
      kbd: { prio: 1, glide: 2 }, o1b: { freq: 0.1 }, o1c: { freq: -0.09 },
      lpf: { freq: 2, regen: 0 }, att: { a1: 1 }, out: { level: 7.5 },
      eg1: { t1: 5.5, t2: 6, es: 9, t3: 6 }, eg2: { t1: 5, t2: 6, es: 6, t3: 6 },
      ffb: Object.fromEntries([2, 1, 1, 2, 4, 7, 10, 9, 6, 2, 8, 3, 1, 0].map((v, i) => ['g' + i, v])), // "ah"-like peaks
    },
    cables: [...PITCH, ['mix1.pos', 'lpf.in'], ['lpf.out', 'ffb.in'], ['ffb.o1', 'vca1.sigp'], ['vca1.outp', 'out.l'],
      ['eg1.o1', 'vca1.c1'], ['eg2.o1', 'att.i1'], ['att.o1', 'lpf.c2'], ...KBD_TRIG, ...osc('o1a.saw', 'o1b.saw', 'o1c.saw')],
  },

  // ------------------------------------------------------------------ effects / percussion
  {
    cat: FX, name: 'Viento · ruido y resonancia',
    params: {
      vco1: { lo: 1, freq: 5 }, vco2: { lo: 1, freq: -4 },
      lpf: { freq: 1, regen: 8.6 }, att: { a1: 10, a2: 6 },
      vca1: { gain: 10 }, out: { level: 8 },
    },
    cables: [['noise.p1', 'lpf.in'], ['lpf.out', 'vca1.sigp'], ['vca1.outp', 'out.l'],
      ['vco2.tri', 'att.i1'], ['att.o1', 'lpf.c1'], ['vco1.sine', 'att.i2'], ['att.o2', 'lpf.c2']],
  },
  {
    cat: FX, name: 'Olas del mar',
    params: { vco2: lfo(0.09), lpf: { freq: 0.5, regen: 0 }, vca1: { gain: 4 }, out: { level: 9.5 } },
    cables: [['noise.p1', 'lpf.in'], ['lpf.out', 'vca1.sigp'], ['vca1.outp', 'out.l'],
      ['vco2.tri', 'mult3.a1'], ['mult3.a2', 'lpf.c1'], ['mult3.a3', 'vca1.c1']],
  },
  {
    cat: FX, name: 'Sirena',
    params: { vco2: lfo(0.5), att: { a1: 10 }, o1a: { range: 3 }, lpf: { freq: 3 }, vca1: { gain: 7 } },
    cables: [['vco2.tri', 'att.i1'], ['att.o1', 'drv1.f1'], ['o1a.rect', 'lpf.in'], ['lpf.out', 'vca1.sigp'], ['vca1.outp', 'out.l']],
  },
  {
    cat: FX, name: 'Tom sintético (filtro percutido)',
    params: {
      kbd: { prio: 1 }, lpf: { freq: -1.5, regen: 10 }, att: { a1: 2 }, out: { level: 7 },
      eg1: { t1: 0, t2: 5.5, es: 0, t3: 5 }, eg2: { t1: 0, t2: 4, es: 0, t3: 4 },
    },
    cables: [['kbd.pitch', 'lpf.c1'], ['eg2.o1', 'att.i1'], ['att.o1', 'lpf.c2'], ['lpf.out', 'vca1.sigp'], ['eg1.o1', 'vca1.c1'], ['vca1.outp', 'out.l'], ...KBD_TRIG,
      ['kbd.vtrig', 'lpf.in']], // the trigger edge "pings" the resonant filter
  },

  { cat: CATS[5], name: 'Sin cables', params: {}, cables: [] },
];

// ------------------------------------------------------------------ pedalboard
// Every patch leaves the modular through the pedal chain echo -> flanger -> reverb -> stereo output.
// Only the pedals listed here are switched on for each patch (with these settings); the rest are bypassed.
const echoT = (sec) => 10 * Math.log(sec / 0.02) / Math.log(50); // TIME knob position for a delay in seconds
const steps = (n, hz) => echoT(n / hz);                           // ... for n sequencer steps at hz steps per second
const E = (time, fb = 4, mix = 4) => ({ time, fb, mix });
const R = (decay = 6, mix = 3, tone = 5) => ({ decay, mix, tone });
const F = (rate = 3, depth = 7, manual = 4, fb = 5) => ({ rate, depth, manual, fb });
const PEDAL_FX = {
  'Bajo clásico · 3 osciladores': {},
  'Bajo redondo de triángulo': {},
  'Solista con portamento y vibrato': { echo: E(echoT(0.38), 4, 3.5), reverb: R(6.5, 3) },
  'Sync lead': { echo: E(echoT(0.3), 4.5, 3.5) },
  'Solista en quintas paralelas': { reverb: R(7, 3.5) },
  'Metales': { reverb: R(5.5, 2.5) },
  'Berlín · ostinato de 8 pasos': { echo: E(steps(3, 7.3), 4.5, 4) },
  'Berlín · 16 pasos (el 962 alterna las filas A y B)': { echo: E(steps(3, 8), 4, 3.5), reverb: R(5, 2) },
  'Bajo en octavas · disco electrónico': { echo: E(steps(3, 8.3), 5, 4) },
  'Secuencia rápida con barrido lento de filtro': { flanger: F(1, 8, 4, 6), echo: E(steps(3, 11), 4, 3) },
  'Ritmo irregular (la 3ª fila controla el tiempo)': { reverb: R(5.5, 3) },
  'Secuencia tímbrica (tono, filtro y ancho de pulso por paso)': { echo: E(steps(2, 6), 3.5, 3) },
  'Secuencia en quintas paralelas': { reverb: R(6.5, 3.5) },
  'Dúo secuenciado: bajo (fila A) y melodía (fila B)': { echo: E(steps(3, 6.5), 3.5, 3), reverb: R(5.5, 2.5) },
  'Bajo y caja de ruido secuenciados': { reverb: R(4, 2.2, 6) },
  'Silbido secuenciado (904A auto-oscilando)': { level: 6, echo: E(steps(3, 4), 4.5, 4), reverb: R(7, 3.5) },
  'Secuencia lenta de campanas': { level: 4.5, reverb: R(8, 4.5, 6) },
  'Frase de un disparo (cada tecla lanza la secuencia)': { echo: E(steps(2, 3.4), 4.5, 4), reverb: R(6.5, 3) },
  'Berlín con eco (tres pasos de retardo)': { echo: E(steps(3, 7.3), 5, 5), reverb: R(5, 2.5) },
  'Solista con eco y reverb': { echo: E(7.2, 4.5, 4), reverb: R(7, 3.5, 4) },
  'Cuerdas con flanger y reverb': { level: 3.7, flanger: F(1.5, 8, 4.5, 6), reverb: R(8, 4.5, 4) },
  'Campanas lentas en una sala grande': { echo: E(9, 5.5, 3.5), reverb: R(9, 5, 6) },
  'Cuerdas PWM': { level: 4.5, reverb: R(7, 3.5, 4) },
  'Órgano de armónicos': { reverb: R(6, 2.5) },
  'Clavecín': { reverb: R(5, 2.5, 6) },
  'Flauta': { reverb: R(6.5, 3.5) },
  'Campana FM': { echo: E(echoT(0.45), 3.5, 2.5), reverb: R(8, 4, 6) },
  'Coro de formantes (914)': { reverb: R(8, 4.5, 4) },
  'Viento · ruido y resonancia': { reverb: R(7.5, 3.5) },
  'Olas del mar': { reverb: R(6, 3, 4) },
  'Sirena': { level: 4.5, echo: E(echoT(0.33), 5, 4), flanger: F(0.5, 6, 5, 4) },
  'Tom sintético (filtro percutido)': { reverb: R(5, 3) },
};
for (const p of FACTORY) {
  if (!p.cables.length) continue;
  const fx = PEDAL_FX[p.name] || {};
  const src = p.cables.find(([, to]) => to === 'out.l')[0];
  p.cables = [...p.cables.filter(([, to]) => to !== 'out.l' && to !== 'out.r'),
    [src, 'echo.in'], ['echo.out', 'flanger.in'], ['flanger.out', 'reverb.in'], ['reverb.l', 'out.l'], ['reverb.r', 'out.r']];
  for (const k of ['echo', 'flanger', 'reverb']) p.params[k] = { ...fx[k], on: fx[k] ? 1 : 0 };
  if (fx.level) p.params.out = { ...p.params.out, level: fx.level }; // the effects add level: trim the master
}
export const FX_NAMES = Object.keys(PEDAL_FX);
