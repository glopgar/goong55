// Panel definitions (UI layout + control ranges) and the cabinet layout.
// Coordinates are panel pixels: 1U = 76 px wide, panels are 340 px tall.
export const U = 76, PH = 352;

const TEN = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const K = (id, x, y, label, o = {}) => ({ t: 'knob', id, x, y, label, min: 0, max: 10, def: 0, size: 'M', scale: TEN, ...o });
const J = (id, x, y, label, dir, o = {}) => ({ t: 'jack', id, x, y, label, dir, kind: 'sig', ...o });
const S = (id, x, y, label, pos, def = 0) => ({ t: 'sw', id, x, y, label, pos, def, min: 0, max: pos.length - 1 });
const R = (id, x, y, label, pos, def = 0) => ({ t: 'rot', id, x, y, label, pos, def, min: 0, max: pos.length - 1 });
const B = (id, x, y, label) => ({ t: 'btn', id, x, y, label, def: 0, min: 0, max: 1 });
const L = (id, x, y, label) => ({ t: 'lamp', id, x, y, label });
const T = (x, y, text, o = {}) => ({ t: 'text', x, y, text, ...o });
const PK = (id, x, y, label, def) => K(id, x, y, label, { size: 'S', scale: null, def }); // pedal knob
const FOOT = (id, x, y) => ({ ...S(id, x, y, '', ['OFF', 'ON'], 1), foot: true }); // latching footswitch with LED
const BIP12 = ['-12', '', '-8', '', '-4', '', '0', '', '4', '', '8', '', '12'];
const BIP5 = ['-5', '-4', '-3', '-2', '-1', '0', '1', '2', '3', '4', '5'];
const SYNC = ['WEAK', 'OFF', 'STRONG'];

const seqUI = () => {
  const ui = [];
  ui.push(T(93, 14, 'OSCILLATOR'));
  ui.push(R('frange', 48, 64, 'FREQUENCY RANGE', ['1', '2', '3', '4', '5', '6'], 3));
  ui.push(K('fvern', 138, 64, 'FREQ VERNIER', { def: 5 }));
  ui.push(L('run', 93, 122, ''));
  ui.push(B('on', 40, 150, 'ON'), B('off', 93, 150, 'OFF'), B('shift', 146, 150, 'SHIFT'));
  ui.push(J('on', 40, 208, 'ON', 'in'), J('off', 93, 208, 'OFF', 'in'), J('shift', 146, 208, 'SHIFT', 'in'));
  ui.push(T(93, 232, 'TRIGGER INPUTS', { line: 130 }));
  ui.push(J('ctl', 40, 292, 'CONTROL IN', 'in'), J('clk', 93, 292, 'OSC OUT', 'out'));
  ui.push(S('timing', 146, 286, '3RD ROW TIMING', ['OFF', 'ON'], 0));
  for (let i = 0; i < 8; i++) {
    const cx = 236 + 64 * i, n = i + 1;
    ui.push(L('l' + n, cx, 16, ''), T(cx + 14, 19, String(n), { size: 9, bold: true }));
    ui.push(K('a' + n, cx, 62, '', { def: 0 }), K('b' + n, cx, 128, '', { def: 0 }), K('c' + n, cx, 194, '', { def: 0 }));
    ui.push({ ...S('m' + n, cx - 15, 250, 'STAGE ' + n + ' MODE', ['SKIP', 'NORMAL', 'STOP'], 1), quiet: true }, B('set' + n, cx + 15, 250, 'SET'));
    ui.push(J('t' + n, cx - 15, 296, 'IN', 'in'), J('g' + n, cx + 15, 296, 'OUT', 'out'));
  }
  ui.push(T(198, 239, 'STOP'), T(198, 250, 'NORM'), T(198, 261, 'SKIP'));
  ['A', 'B', 'C'].forEach((r, k) => {
    const y = 62 + 66 * k;
    ui.push(S('rng' + r, 762, y, '', ['X1', 'X2', 'X4'], 1));
    ui.push(J('out' + r + '1', 816, y, r, 'out'), J('out' + r + '2', 856, y, r, 'out'));
  });
  ui.push(T(836, 20, 'ROW OUTPUTS', { line: 80 }), T(762, 20, 'RANGE'));
  ui.push(L('l9', 780, 262, ''), S('m9', 836, 262, '9TH STAGE', ['SKIP', 'STOP'], 0));
  return ui;
};

export const TYPES = {
  vco921: {
    w: 2, num: '921', name: 'VOLTAGE CONTROLLED OSCILLATOR', ui: [
      K('freq', 44, 52, 'FREQUENCY', { size: 'L', min: -12, max: 12, scale: BIP12 }),
      R('range', 114, 50, 'RANGE', ["32'", "16'", "8'", "4'", "2'", "1'"], 2),
      S('scale', 18, 134, 'SCALE', ['SEMI', 'OCT'], 0),
      S('lo', 50, 134, 'RANGE', ['AUDIO', 'LO'], 0),
      S('syncm', 82, 134, 'SYNC', SYNC, 1),
      K('auxl', 132, 130, 'AUX LEVEL', { size: 'S', def: 10, scale: null }),
      R('auxw', 44, 196, 'AUX WAVEFORM', ['SIN', 'TRI', 'SAW', 'SAW−', 'REC', 'REC−'], 0),
      K('width', 122, 194, 'WIDTH', { size: 'S', def: 5, scale: null }),
      J('f1', 16, 254, '', 'in'), J('f2', 40, 254, 'FREQUENCY', 'in'), J('f3', 64, 254, '', 'in'),
      J('w', 88, 254, 'WIDTH', 'in'), J('ac', 112, 254, 'AC', 'in'), J('dc', 136, 254, 'DC', 'in'),
      J('sync', 16, 298, 'SYNC', 'in'), J('sine', 40, 298, 'SIN', 'out'), J('tri', 64, 298, 'TRI', 'out'),
      J('saw', 88, 298, 'SAW', 'out'), J('rect', 112, 298, 'RECT', 'out'), J('aux', 136, 298, 'AUX', 'out'),
    ],
  },
  drv921a: {
    w: 1, num: '921A', name: 'OSCILLATOR DRIVER', ui: [
      K('freq', 38, 52, 'FREQUENCY', { size: 'L', min: -12, max: 12, scale: BIP12 }),
      S('scale', 38, 124, 'RANGE', ['SEMITONE', 'OCTAVE'], 0),
      K('width', 38, 186, 'WIDTH', { def: 5 }),
      J('f1', 14, 254, '', 'in'), J('f2', 38, 254, 'FREQUENCY', 'in'), J('f3', 62, 254, '', 'in'),
      J('w1', 24, 298, 'WIDTH', 'in', { lx: 14 }), J('w2', 52, 298, '', 'in'),
      J('busf', 0, 0, '', 'out', { hidden: true }), J('busw', 0, 0, '', 'out', { hidden: true }),
    ],
  },
  osc921b: {
    w: 1, num: '921B', name: 'OSCILLATOR', ui: [
      K('freq', 38, 50, 'FREQUENCY', { size: 'L', min: -12, max: 12, scale: BIP12 }),
      R('range', 38, 118, '', ["32'", "16'", "8'", "4'", "2'"], 2),
      S('syncm', 18, 166, '', SYNC, 1), J('sync', 56, 170, 'SYNC', 'in'),
      J('ac', 22, 216, 'AC MOD', 'in'), J('dc', 54, 216, 'DC MOD', 'in'),
      J('sine', 22, 258, 'SINE', 'out'), J('tri', 54, 258, 'TRI', 'out'),
      J('saw', 22, 300, 'SAW', 'out'), J('rect', 54, 300, 'RECT', 'out'),
      J('busf', 0, 0, '', 'in', { hidden: true }), J('busw', 0, 0, '', 'in', { hidden: true }),
    ],
  },
  lpf904a: {
    w: 2, num: '904A', name: 'VOLTAGE CONTROLLED LOW PASS FILTER', ui: [
      K('freq', 76, 58, 'FIXED CONTROL VOLTAGE', { size: 'L', min: -5, max: 5, def: 0, scale: BIP5 }),
      R('range', 40, 152, 'FREQUENCY RANGE', ['1', '2', '3'], 1),
      K('regen', 112, 152, 'REGENERATION'),
      J('c1', 40, 234, '', 'in'), J('c2', 76, 234, 'CONTROL INPUTS', 'in'), J('c3', 112, 234, '', 'in'),
      J('in', 40, 296, 'SIGNAL INPUT', 'in'), J('out', 112, 296, 'SIGNAL OUTPUT', 'out'),
    ],
  },
  hpf904b: {
    w: 2, num: '904B', name: 'VOLTAGE CONTROLLED HIGH PASS FILTER', ui: [
      K('freq', 76, 58, 'FIXED CONTROL VOLTAGE', { size: 'L', min: -5, max: 5, def: -5, scale: BIP5 }),
      S('range', 76, 152, 'FREQUENCY RANGE', ['LOW', 'HIGH'], 0),
      J('c1', 40, 234, '', 'in'), J('c2', 76, 234, 'CONTROL INPUTS', 'in'), J('c3', 112, 234, '', 'in'),
      J('in', 40, 296, 'SIGNAL INPUT', 'in'), J('out', 112, 296, 'SIGNAL OUTPUT', 'out'),
    ],
  },
  vca902: {
    w: 1, num: '902', name: 'VOLTAGE CONTROLLED AMPLIFIER', ui: [
      K('gain', 38, 52, 'GAIN', { size: 'L' }),
      S('mode', 38, 122, '', ['LINEAR', 'EXPON'], 0),
      J('c1', 14, 184, '', 'in'), J('c2', 38, 184, 'CONTROL INPUTS', 'in'), J('c3', 62, 184, '', 'in'),
      T(38, 211, 'SIGNAL INPUTS'), J('sigp', 22, 242, '+', 'in'), J('sign', 54, 242, '−', 'in'),
      T(38, 269, 'SIGNAL OUTPUTS'), J('outp', 22, 300, '+', 'out'), J('outn', 54, 300, '−', 'out'),
    ],
  },
  eg911: {
    w: 1, num: '911', name: 'ENVELOPE GENERATOR', ui: [
      K('t1', 38, 44, 'T1', { def: 1 }), K('t2', 38, 106, 'T2', { def: 5 }),
      K('es', 38, 168, 'E SUS', { def: 7 }), K('t3', 38, 230, 'T3', { def: 4 }),
      J('trig', 15, 298, 'S-TRIG', 'in', { kind: 'strig' }), J('o1', 42, 298, 'OUT', 'out', { lx: 52 }), J('o2', 63, 298, '', 'out'),
    ],
  },
  dly911a: {
    w: 1, num: '911A', name: 'DUAL TRIGGER DELAY', ui: [
      K('t1', 38, 44, 'DELAY TIME', { def: 3 }),
      J('in1', 20, 104, 'IN', 'in', { kind: 'strig' }), J('o1', 56, 104, 'OUT', 'out', { kind: 'strig' }),
      S('mode', 18, 160, 'COUPLING', ['OFF', 'PARALLEL', 'SERIES'], 0),
      K('t2', 38, 222, 'DELAY TIME', { def: 3 }),
      J('in2', 20, 296, 'IN', 'in', { kind: 'strig' }), J('o2', 56, 296, 'OUT', 'out', { kind: 'strig' }),
    ],
  },
  noise903a: {
    w: 1, num: '903A', name: 'RANDOM SIGNAL GENERATOR', ui: [
      T(38, 70, 'WHITE', { size: 9, line: 60 }), J('w1', 22, 106, '', 'out'), J('w2', 54, 106, '', 'out'),
      T(38, 190, 'PINK', { size: 9, line: 60 }), J('p1', 22, 226, '', 'out'), J('p2', 54, 226, '', 'out'),
    ],
  },
  ffb914: {
    w: 4, num: '914', name: 'FIXED FILTER BANK', ui: [
      ...['LOW PASS 88', '125', '175', '250', '350', '500', '700', '1K', '1.4K', '2K', '2.8K', '4K', '5.6K', 'HIGH PASS 7K'].map((lab, i) =>
        K('g' + i, 26 + 42 * (i % 7), i < 7 ? 56 : 150, lab, { size: 'S', def: 5, scale: null, wrap: 40 })),
      J('in', 60, 284, 'SIGNAL INPUT', 'in'), J('o1', 222, 284, 'SIGNAL OUTPUTS', 'out', { lx: 240 }), J('o2', 258, 284, '', 'out'),
    ],
  },
  mix: {
    w: 2, num: 'CP3A', name: 'MIXER', ui: [
      K('l1', 42, 46, '1', { def: 5 }), K('l2', 110, 46, '2', { def: 5 }),
      K('l3', 42, 112, '3', { def: 5 }), K('l4', 110, 112, '4', { def: 5 }),
      K('master', 76, 180, 'MASTER GAIN', { def: 10 }),
      J('i1', 22, 252, '1', 'in'), J('i2', 58, 252, '2', 'in'), J('i3', 94, 252, '3', 'in'), J('i4', 130, 252, '4', 'in'),
      T(76, 226, 'INPUTS', { line: 120 }),
      J('pos', 58, 300, 'OUT +', 'out'), J('neg', 94, 300, 'OUT −', 'out'),
    ],
  },
  att995: {
    w: 1, num: '995', name: 'ATTENUATORS', ui: [0, 1, 2].flatMap((i) => [
      K('a' + (i + 1), 38, 34 + 98 * i, '', { size: 'S', def: 5, scale: null }),
      J('i' + (i + 1), 22, 88 + 98 * i, 'IN', 'in'), J('o' + (i + 1), 54, 88 + 98 * i, 'OUT', 'out'),
    ]),
  },
  mult994: {
    w: 1, num: '994', name: 'DUAL MULTIPLES', ui: [
      T(38, 28, 'MULTIPLE', { line: 60 }),
      J('a1', 22, 60, '', 'mult', { g: 'a' }), J('a2', 54, 60, '', 'mult', { g: 'a' }), J('a3', 22, 100, '', 'mult', { g: 'a' }), J('a4', 54, 100, '', 'mult', { g: 'a' }),
      T(38, 178, 'MULTIPLE', { line: 60 }),
      J('b1', 22, 210, '', 'mult', { g: 'b' }), J('b2', 54, 210, '', 'mult', { g: 'b' }), J('b3', 22, 250, '', 'mult', { g: 'b' }), J('b4', 54, 250, '', 'mult', { g: 'b' }),
    ],
  },
  seq960: { w: 12, num: '960', name: 'SEQUENTIAL CONTROLLER', ui: seqUI() },
  sw962: {
    w: 1, num: '962', name: 'SEQUENTIAL SWITCH', ui: [
      L('l1', 18, 60, ''), J('s1', 50, 60, 'IN 1', 'in'),
      L('l2', 18, 116, ''), J('s2', 50, 116, 'IN 2', 'in'),
      L('l3', 18, 172, ''), J('s3', 50, 172, 'IN 3', 'in'),
      J('shift', 22, 250, 'SHIFT', 'in'), J('out', 54, 298, 'OUTPUT', 'out'),
    ],
  },
  ifc961: {
    w: 2, num: '961', name: 'INTERFACE', ui: [
      J('va', 36, 70, 'V-TRIG IN', 'in'), T(76, 70, '▶', { size: 10 }), J('sa', 116, 70, 'S-TRIG OUT', 'out', { kind: 'strig' }),
      J('vb', 36, 150, 'V-TRIG IN', 'in'), T(76, 150, '▶', { size: 10 }), J('sb', 116, 150, 'S-TRIG OUT', 'out', { kind: 'strig' }),
      J('s', 36, 240, 'S-TRIG IN', 'in', { kind: 'strig' }), T(76, 240, '▶', { size: 10 }), J('v', 116, 240, 'V-TRIG OUT', 'out'),
    ],
  },
  kbd: {
    w: 2, num: '950', name: 'KEYBOARD CONTROLLER · MIDI', ui: [
      K('glide', 44, 54, 'PORTAMENTO', { size: 'L' }),
      K('bend', 116, 56, 'BEND RANGE', { def: 1.67 }),
      S('prio', 36, 146, 'NOTE PRIORITY', ['LOW', 'LAST', 'HIGH'], 0),
      L('gate', 116, 146, 'TRIGGER'),
      J('pitch', 18, 226, 'PITCH', 'out'), J('vel', 47, 226, 'VEL', 'out'), J('bendo', 76, 226, 'BEND', 'out'),
      J('mod', 105, 226, 'MOD', 'out'), J('at', 134, 226, 'PRESS', 'out'),
      J('vtrig', 22, 292, 'V-TRIG', 'out'),
      J('strig1', 62, 292, '', 'out', { kind: 'strig' }), J('strig2', 94, 292, 'S-TRIG', 'out', { kind: 'strig' }), J('strig3', 126, 292, '', 'out', { kind: 'strig' }),
    ],
  },
  kbd2: {
    w: 1, num: '950B', name: 'MIDI VOICE B', ui: [
      K('glide', 38, 46, 'PORTAMENTO'),
      S('prio', 28, 124, 'NOTE PRIORITY', ['LOW', 'LAST', 'HIGH'], 1),
      L('gate', 38, 172, 'TRIGGER'),
      J('pitch', 22, 222, 'PITCH', 'out'), J('vel', 54, 222, 'VEL', 'out'),
      J('vtrig', 38, 262, 'V-TRIG', 'out'),
      J('strig1', 22, 302, 'S-TRIG', 'out', { kind: 'strig', lx: 38 }), J('strig2', 54, 302, '', 'out', { kind: 'strig' }),
    ],
  },
  out: {
    w: 2, num: '', name: 'OUTPUT', ui: [
      { t: 'vu', id: 'vu', x: 76, y: 62 },
      K('level', 76, 172, 'MASTER LEVEL', { size: 'L', def: 6 }),
      J('l', 44, 288, 'LEFT / MONO', 'in'), J('r', 108, 288, 'RIGHT', 'in'),
    ],
  },
  // Effect pedals (on the floor next to the keyboard). Patchable like any module.
  fxecho: {
    w: 0, num: '', name: '', pedal: { w: 156, h: 190, bg: 'linear-gradient(160deg, #2f6f58, #174335)' }, ui: [
      PK('time', 30, 32, 'TIME', 5), PK('fb', 78, 32, 'REPEATS', 4), PK('mix', 126, 32, 'MIX', 5),
      T(78, 82, 'ANALOG ECHO', { size: 11, bold: true }),
      J('out', 26, 122, 'OUT', 'out'), J('cv', 78, 122, 'TIME CV', 'in'), J('in', 130, 122, 'IN', 'in'),
      FOOT('on', 78, 164),
    ],
  },
  fxflanger: {
    w: 0, num: '', name: '', pedal: { w: 156, h: 190, bg: 'linear-gradient(160deg, #5a3a86, #331d55)' }, ui: [
      PK('rate', 24, 32, 'RATE', 3), PK('depth', 60, 32, 'RANGE', 7), PK('manual', 96, 32, 'MANUAL', 4), PK('fb', 132, 32, 'COLOR', 5),
      T(78, 82, 'FLANGER', { size: 11, bold: true }),
      J('out', 26, 122, 'OUT', 'out'), J('in', 130, 122, 'IN', 'in'),
      FOOT('on', 78, 164),
    ],
  },
  fxreverb: {
    w: 0, num: '', name: '', pedal: { w: 156, h: 190, bg: 'linear-gradient(160deg, #3d4f63, #1f2a38)' }, ui: [
      PK('decay', 30, 32, 'DECAY', 6), PK('tone', 78, 32, 'TONE', 5), PK('mix', 126, 32, 'MIX', 4),
      T(78, 82, 'STEREO REVERB', { size: 11, bold: true }),
      J('l', 24, 122, 'OUT L', 'out'), J('r', 58, 122, 'OUT R', 'out'), J('in', 130, 122, 'IN', 'in'),
      FOOT('on', 78, 164),
    ],
  },
  blank: { w: 1, num: '', name: '', ui: [{ t: 'plate', x: 38, y: 150 }] },
};

// Cabinet: three rows of 20U.
export const ROWS = [
  [['ffb', 'ffb914'], ['hpf', 'hpf904b'], ['lpf', 'lpf904a'], ['noise', 'noise903a'], ['mix1', 'mix'], ['mix2', 'mix'],
    ['vca1', 'vca902'], ['vca2', 'vca902'], ['vca3', 'vca902'], ['eg1', 'eg911'], ['eg2', 'eg911'], ['eg3', 'eg911'], ['dly', 'dly911a']],
  [['vco1', 'vco921'], ['drv1', 'drv921a'], ['o1a', 'osc921b'], ['o1b', 'osc921b'], ['o1c', 'osc921b'],
    ['drv2', 'drv921a'], ['o2a', 'osc921b'], ['o2b', 'osc921b'], ['o2c', 'osc921b'], ['vco2', 'vco921'],
    ['vca4', 'vca902'], ['vca5', 'vca902'], ['eg4', 'eg911'], ['eg5', 'eg911'], ['att', 'att995'], ['mult1', 'mult994'], ['mult2', 'mult994'], ['mult3', 'mult994']],
  [['seq', 'seq960'], ['sw', 'sw962'], ['ifc', 'ifc961'], ['kbd', 'kbd'], ['kbd2', 'kbd2'], ['out', 'out']],
];

// Hard-wired connections behind the panels (921A driver -> its 921B oscillators).
export const INTERNAL = [];
for (const [d, os] of [['drv1', ['o1a', 'o1b', 'o1c']], ['drv2', ['o2a', 'o2b', 'o2c']]]) {
  for (const o of os) { INTERNAL.push([`${d}.busf`, `${o}.busf`], [`${d}.busw`, `${o}.busw`]); }
}

export const PEDALS = [['echo', 'fxecho'], ['flanger', 'fxflanger'], ['reverb', 'fxreverb']];
export const SYSTEM = [...ROWS.flat(), ...PEDALS].map(([id, type]) => ({ id, type }));
export const typeOf = Object.fromEntries(SYSTEM.map((s) => [s.id, s.type]));

// Lookup helpers
export const controlsOf = (type) => TYPES[type].ui.filter((e) => e.t === 'knob' || e.t === 'sw' || e.t === 'rot' || e.t === 'btn');
export const jacksOf = (type) => TYPES[type].ui.filter((e) => e.t === 'jack');
export const jackDef = (ref) => { const [m, j] = ref.split('.'); return jacksOf(typeOf[m]).find((e) => e.id === j); };
export const isStepped = (c) => c.t !== 'knob';

export function defaultParams() {
  const p = {};
  for (const { id, type } of SYSTEM) { p[id] = {}; for (const c of controlsOf(type)) p[id][c.id] = c.def; }
  return p;
}

// Resolve cables (+ passive multiples + internal wiring) into engine wires.
// cables: [{a:'mod.jack', b:'mod.jack'}]
export function compileWires(cables) {
  const parent = new Map();
  const find = (x) => { if (!parent.has(x)) parent.set(x, x); let r = x; while (parent.get(r) !== r) r = parent.get(r); parent.set(x, r); return r; };
  const union = (a, b) => parent.set(find(a), find(b));
  const node = (ref) => { const d = jackDef(ref); return d && d.dir === 'mult' ? `${ref.split('.')[0]}.#${d.g}` : ref; };
  const used = new Set();
  for (const c of [...cables.map((c) => [c.a, c.b]), ...INTERNAL]) {
    if (!jackDef(c[0]) || !jackDef(c[1])) continue;
    union(node(c[0]), node(c[1])); used.add(c[0]); used.add(c[1]);
  }
  const nets = new Map();
  for (const ref of used) {
    const d = jackDef(ref); if (d.dir === 'mult') continue;
    const r = find(node(ref));
    if (!nets.has(r)) nets.set(r, { o: [], i: [] });
    nets.get(r)[d.dir === 'out' ? 'o' : 'i'].push(ref);
  }
  const wires = [];
  for (const { o, i } of nets.values()) {
    for (const d of i) for (const s of o) wires.push({ f: s.split('.'), t: d.split('.'), g: 1 / o.length });
  }
  return wires;
}
