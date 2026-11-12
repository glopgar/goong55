import { SYSTEM, TYPES, typeOf, controlsOf, defaultParams, compileWires, isStepped } from './defs.js';
import { FACTORY, CATS } from './presets.js';
import { createUI, RIG_W, RIG_H } from './ui.js';
import { Midi, srcLabel } from './midi.js';
import { t, tn, lang, setLang, applyI18n } from './i18n.js';

applyI18n();
document.getElementById('lang').value = lang;
document.getElementById('lang').onchange = (e) => setLang(e.target.value);

const $ = (id) => document.getElementById(id);
const LS_CUR = 's55.current', LS_USER = 's55.patches';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const state = { name: '', params: defaultParams(), cables: [], press: [] };
const ctlDef = {};
for (const { id, type } of SYSTEM) for (const c of controlsOf(type)) ctlDef[`${id}.${c.id}`] = c;
const ctlName = (key) => {
  const [m] = key.split('.'), t = TYPES[typeOf[m]], d = ctlDef[key];
  return `${t.num || t.name} (${m}) · ${d.label || d.id.toUpperCase()}`;
};

// ------------------------------------------------------------------ audio
let ctx = null, node = null, starting = null;
const post = (m) => { if (node) node.port.postMessage(m); };
const flatParams = () => Object.entries(state.params).flatMap(([m, o]) => Object.entries(o).map(([k, v]) => [m, k, ctlDef[`${m}.${k}`].t === 'btn' ? 0 : v]));
const sendPatch = () => post({ type: 'patch', wires: compileWires(state.cables) });
function pulse(keys) {
  for (const key of keys) { const [m, p] = key.split('.'); post({ type: 'param', m, p, v: 1, j: true }); setTimeout(() => post({ type: 'param', m, p, v: 0, j: true }), 80); }
}
// The synth is "on" by default. Browsers only let audio start after a user gesture, so if the context
// comes up suspended it is resumed on the first click or key press anywhere on the page.
let wantOn = true, primed = false;
function onAudioState() {
  const on = !!ctx && ctx.state === 'running';
  $('power').classList.toggle('on', on);
  if (on && !primed) { primed = true; pulse(state.press); } // start the 960 etc. once audio really runs
}
async function start() {
  wantOn = true;
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  if (starting) return starting;
  starting = (async () => {
    const c = new AudioContext({ latencyHint: 'interactive' });
    await c.audioWorklet.addModule('dsp/worklet.js');
    node = new AudioWorkletNode(c, 'system55', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    node.port.onmessage = (e) => { if (e.data.type === 'state') ui.setState(e.data.state); };
    node.connect(c.destination);
    ctx = c;
    c.onstatechange = onAudioState;
    post({ type: 'init', system: SYSTEM, params: flatParams(), wires: compileWires(state.cables) });
    if (wantOn) c.resume().catch(() => {}); else c.suspend().catch(() => {});
    onAudioState();
  })().catch((err) => { starting = null; toast(t('audioFail', err.message)); });
  return starting;
}
$('power').onclick = () => {
  if (ctx && ctx.state === 'running') { wantOn = false; ctx.suspend(); } else start();
};
for (const ev of ['pointerdown', 'keydown']) {
  addEventListener(ev, (e) => { if (wantOn && (!ctx || ctx.state !== 'running') && !(e.target.closest && e.target.closest('#power'))) start(); }, true);
}

// ------------------------------------------------------------------ state <-> UI
let saveT = 0;
const autosave = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set(LS_CUR, snapshot()), 400); };
const snapshot = (name = state.name) => ({ name, params: state.params, cables: state.cables, press: state.press });

const held = new Set();
const host = {
  getParam: (key) => { const [m, p] = key.split('.'); return state.params[m][p]; },
  setParam(key, v) {
    const d = ctlDef[key]; if (!d) return;
    v = Math.max(d.min, Math.min(d.max, isStepped(d) ? Math.round(v) : v));
    const [m, p] = key.split('.');
    if (state.params[m][p] === v) return;
    state.params[m][p] = v;
    ui.setControl(key, v);
    post({ type: 'param', m, p, v, j: isStepped(d) });
    if (d.t !== 'btn') autosave();
  },
  cables: () => state.cables,
  cablesChanged() { sendPatch(); autosave(); },
  // k: 0 = voice A (950 panel, on-screen keyboard), 1 = voice B (950B panel)
  noteOn(n, v = 0.8, k = 0) { start(); post({ type: 'on', n, v, k }); if (!k) { held.add(n); ui.setKey(n, true); } },
  noteOff(n, k = 0) { post({ type: 'off', n, k }); if (!k) { held.delete(n); ui.setKey(n, false); } },
  ctl: (k, v) => post({ type: 'ctl', k, v }),
  panic() { for (const n of held) ui.setKey(n, false); held.clear(); post({ type: 'alloff' }); },
  // MIDI
  learning: () => document.body.classList.contains('learning'),
  learnSelect(key) { midi.learnKey = key; ui.markLearn(key); toast(t('learnMove', ctlName(key)), 2500); },
  learned(key, src) { ui.markLearn(null); refreshMapped(); toast(`${ctlName(key)} ← ${srcLabel(src)}`); },
  midiControl(key, x) { const d = ctlDef[key]; if (d) host.setParam(key, d.t === 'btn' ? (x >= 0.5 ? 1 : 0) : d.min + x * (d.max - d.min)); },
  midiMonitor(t) { $('midiMon').textContent = t; },
  midiDevices(list) {
    const sel = $('midiIn'), cur = midi.input;
    sel.innerHTML = `<option value="all">${t('allInputs')}${list.length ? '' : t('noInputs')}</option>` +
      list.map((d) => `<option value="${d.id}">${d.name.replace(/</g, '&lt;')}</option>`).join('');
    sel.value = list.some((d) => d.id === cur) ? cur : 'all'; midi.input = sel.value;
  },
  menu(key, x, y) {
    const src = midi.maps[key];
    showMenu(x, y, ctlName(key), [
      [t('mLearn'), () => host.learnSelect(key)],
      [src ? t('mUnmap', srcLabel(src)) : t('mNone'), src ? () => { midi.unmap(key); refreshMapped(); } : null],
      [t('mReset'), () => host.setParam(key, ctlDef[key].def)],
    ]);
  },
};

const ui = createUI($('rig'), host);
const midi = new Midi(host);
const refreshMapped = () => ui.markMapped(new Set(Object.keys(midi.maps)));

function applyPatch(p) {
  host.panic();
  state.name = p.name || '';
  state.params = defaultParams();
  for (const [m, o] of Object.entries(p.params || {})) if (state.params[m]) for (const [k, v] of Object.entries(o)) if (k in state.params[m] && typeof v === 'number') state.params[m][k] = v;
  state.cables = (p.cables || []).map((c, i) => (Array.isArray(c) ? { a: c[0], b: c[1], color: i } : { a: c.a, b: c.b, color: c.color | 0 }))
    .filter((c) => typeof c.a === 'string' && typeof c.b === 'string');
  state.press = p.press || [];
  for (const key in ctlDef) ui.setControl(key, ctlDef[key].t === 'btn' ? 0 : host.getParam(key));
  ui.drawCables();
  post({ type: 'params', params: flatParams() });
  sendPatch();
  pulse(state.press);
  autosave();
}

// ------------------------------------------------------------------ patches
function fillPresets(selected) {
  const user = store.get(LS_USER, []);
  $('preset').innerHTML = CATS.map((cat) => `<optgroup label="${tn(cat)}">` + FACTORY.map((p, i) => (p.cat === cat ? `<option value="f${i}">${tn(p.name)}</option>` : '')).join('') + '</optgroup>').join('') +
    (user.length ? `<optgroup label="${t('user')}">` + user.map((p, i) => `<option value="u${i}">${String(p.name).replace(/</g, '&lt;')}</option>`).join('') + '</optgroup>' : '');
  if (selected != null) $('preset').value = selected;
}
$('preset').onchange = (e) => {
  const v = e.target.value, list = v[0] === 'f' ? FACTORY : store.get(LS_USER, []);
  const p = list[+v.slice(1)]; if (p) applyPatch(p);
  e.target.blur();
};
$('save').onclick = () => {
  const name = prompt(t('patchName'), state.name && !FACTORY.some((p) => p.name === state.name) ? state.name : t('myPatch'));
  if (!name) return;
  const user = store.get(LS_USER, []), i = user.findIndex((p) => p.name === name);
  state.name = name;
  if (i >= 0) user[i] = snapshot(); else user.push(snapshot());
  store.set(LS_USER, user);
  fillPresets('u' + (i >= 0 ? i : user.length - 1));
  toast(t('saved'));
};
$('del').onclick = () => {
  const v = $('preset').value;
  if (v[0] !== 'u') return toast(t('onlyUser'));
  const user = store.get(LS_USER, []);
  if (!confirm(t('confirmDel', user[+v.slice(1)].name))) return;
  user.splice(+v.slice(1), 1); store.set(LS_USER, user); fillPresets('f0');
};
$('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 1)], { type: 'application/json' }));
  a.download = (state.name || 'patch').replace(/[^\w\- ]+/g, '_') + '.s55.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('import').onclick = () => $('file').click();
$('file').onchange = async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try { applyPatch(JSON.parse(await file.text())); toast(t('imported')); } catch { toast(t('badFile')); }
};

// ------------------------------------------------------------------ MIDI UI
$('midiCh').innerHTML = `<option value="-1">${t('vAomni')}</option>` + Array.from({ length: 16 }, (_, i) => `<option value="${i}">${t('vAch', i + 1)}</option>`).join('');
$('midiCh').onchange = (e) => { midi.channel = +e.target.value; };
$('midiChB').innerHTML = `<option value="-1">${t('vBnone')}</option>` + Array.from({ length: 16 }, (_, i) => `<option value="${i}">${t('vBch', i + 1)}</option>`).join('');
$('midiChB').value = String(midi.channelB);
$('midiChB').onchange = (e) => { midi.channelB = +e.target.value; };
$('midiIn').onchange = (e) => { midi.input = e.target.value; };
$('learn').onclick = () => {
  const on = document.body.classList.toggle('learning');
  $('learn').classList.toggle('active', on);
  if (!on) { midi.learnKey = null; ui.markLearn(null); } else toast(t('learnOn'), 3500);
};
$('maps').onclick = () => {
  const rows = Object.entries(midi.maps).map(([k, s]) => `<tr><td>${ctlName(k)}</td><td>${srcLabel(s)}</td><td><button data-k="${k}">${t('remove')}</button></td></tr>`).join('');
  dialog(`<h2>${t('mapsTitle')}</h2>${rows ? `<table><tr><th>${t('control')}</th><th>${t('source')}</th><th></th></tr>${rows}</table>` : `<p>${t('noMaps')}</p>`}
    <div class="row">${rows ? `<button id="mclr">${t('clearAll')}</button>` : ''}<button id="dclose">${t('close')}</button></div>`);
  $('dlg').querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { midi.unmap(b.dataset.k); refreshMapped(); $('maps').onclick(); }; });
  if ($('mclr')) $('mclr').onclick = () => { midi.clear(); refreshMapped(); $('maps').onclick(); };
};
$('help').onclick = () => dialog(`<h2>${t('helpTitle')}</h2><ul>${t('help')}</ul><div class="row"><button id="dclose">${t('close')}</button></div>`);
$('panic').onclick = () => host.panic();

// ------------------------------------------------------------------ menu / dialog / toast
function showMenu(x, y, title, items) {
  const m = $('menu');
  m.innerHTML = `<div class="hd">${title}</div>`;
  for (const [text, fn] of items) {
    const it = document.createElement('div'); it.className = 'it' + (fn ? '' : ' dis'); it.textContent = text;
    it.onclick = () => { m.hidden = true; fn && fn(); };
    m.appendChild(it);
  }
  m.hidden = false;
  m.style.left = Math.min(x, innerWidth - m.offsetWidth - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - m.offsetHeight - 8) + 'px';
}
addEventListener('pointerdown', (e) => { if (!e.target.closest('#menu')) $('menu').hidden = true; }, true);
function dialog(html) {
  const d = $('dlg'); d.innerHTML = html;
  $('dclose').onclick = () => d.close();
  if (!d.open) d.showModal();
}
let toastT = 0;
function toast(text, ms = 1800) {
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = text; t.style.opacity = 1;
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; }, ms);
}

// ------------------------------------------------------------------ zoom
let zoom = 1;
function setZoom(z) {
  zoom = Math.max(0.35, Math.min(2.5, z));
  $('rig').style.transform = `scale(${zoom})`; $('rig').style.transformOrigin = '0 0';
  $('scaler').style.width = RIG_W * zoom + 'px'; $('scaler').style.height = RIG_H * zoom + 'px';
}
const fit = () => setZoom(Math.min(1.5, ($('stage').clientWidth - 36) / RIG_W));
$('zIn').onclick = () => setZoom(zoom * 1.15);
$('zOut').onclick = () => setZoom(zoom / 1.15);
$('zFit').onclick = fit;
let fitted = true;
addEventListener('resize', () => { if (fitted) fit(); });
$('zIn').addEventListener('click', () => { fitted = false; }); $('zOut').addEventListener('click', () => { fitted = false; }); $('zFit').addEventListener('click', () => { fitted = true; });
$('cableOp').oninput = (e) => { document.getElementById('cables').style.opacity = e.target.value / 100; };

// ------------------------------------------------------------------ computer keyboard
const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 };
let octave = 1; const down = {};
addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || $('dlg').open) return;
  if (e.code === 'KeyZ') { octave = Math.max(0, octave - 1); return; }
  if (e.code === 'KeyX') { octave = Math.min(4, octave + 1); return; }
  if (e.code in KEYMAP && !(e.code in down)) { const n = 36 + 12 * octave + KEYMAP[e.code]; down[e.code] = n; host.noteOn(n, 0.8); }
});
addEventListener('keyup', (e) => { if (e.code in down) { host.noteOff(down[e.code]); delete down[e.code]; } });
addEventListener('blur', () => { for (const c in down) { host.noteOff(down[c]); delete down[c]; } });

// ------------------------------------------------------------------ boot
fit();
const saved = store.get(LS_CUR, null);
applyPatch(saved && saved.params ? saved : FACTORY[0]);
fillPresets(saved && saved.params ? (() => { const i = FACTORY.findIndex((p) => p.name === saved.name); return i >= 0 ? 'f' + i : null; })() : 'f0');
start(); // powered on by default
midi.init().then((ok) => { if (!ok) $('midiMon').textContent = t('noMidi'); refreshMapped(); });
window.s55 = { state, host, midi }; // for debugging / automated tests
