// Cabinet rendering and direct manipulation: knobs, switches, jacks, patch cables, keyboard.
import { U, PH, TYPES, ROWS, PEDALS, jackDef } from './defs.js';
import { t } from './i18n.js';

const SIDE = 30, TOP = 26, GAP = 10;
export const CAB_W = 20 * U + 2 * SIDE, CAB_H = 2 * TOP + ROWS.length * PH + (ROWS.length - 1) * GAP;
const KB_LOW = 36, KB_KEYS = 61, KB_H = 190, KB_TOP = CAB_H + 28;
const KB_W = 22 + 150 + 14 + 36 * 24 + 22;
export const RIG_W = CAB_W, RIG_H = KB_TOP + KB_H + 80; // room below the pedals for hanging cables

const CABLE_COLORS = [['#c8281e', '#ff8a7a'], ['#1d5fc4', '#8ab8ff'], ['#d9b21a', '#fff0a0'], ['#2f9a48', '#a5f0b5'],
  ['#8a8f96', '#e2e5e9'], ['#d8641a', '#ffc08a'], ['#e8e4d8', '#ffffff'], ['#7a3fb0', '#d0a8f5']];

const el = (tag, cls, parent, css) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (css) Object.assign(e.style, css);
  if (parent) parent.appendChild(e);
  return e;
};
const px = (v) => v + 'px';
const f = (v) => v.toFixed(2);

export function createUI(rig, host) {
  const controls = {}, jackPos = {}, jackEls = {}, lamps = {}, vus = {}, keyEls = {};
  let colorIdx = 0, temp = null;

  rig.style.width = px(RIG_W); rig.style.height = px(RIG_H);
  const cab = el('div', 'wood', rig, { width: px(CAB_W), height: px(CAB_H) }); cab.id = 'cab';

  const label = (parent, x, y, text, o = {}) => {
    if (!text) return null;
    const l = el('div', 'lbl' + (o.line ? ' rule' : '') + (o.wrap ? ' wrap' : ''), parent, { left: px(x), top: px(y) });
    l.textContent = text;
    if (o.size) { l.style.fontSize = px(o.size); l.style.lineHeight = px(o.size + 1); }
    if (o.bold) l.style.fontWeight = '700';
    if (o.line) l.style.setProperty('--w', px(o.line));
    if (o.wrap) l.style.width = px(o.wrap);
    if (o.left) l.style.transform = 'translate(0,-50%)';
    return l;
  };

  // ---------------------------------------------------------------- control builders
  function buildKnob(panel, d) {
    const R = { L: 21, M: 15, S: 11 }[d.size], pad = d.scale ? 15 : 7, sz = 2 * (R + pad);
    const n = d.scale ? d.scale.length : 11;
    let s = `<svg width="${sz}" height="${sz}" viewBox="${-sz / 2} ${-sz / 2} ${sz} ${sz}">`;
    for (let i = 0; i < n; i++) {
      const a = (-135 + 270 * i / (n - 1)) * Math.PI / 180, sx = Math.sin(a), cy = -Math.cos(a);
      const major = !d.scale || d.scale[i] !== '';
      s += `<line x1="${f(sx * (R + 2.5))}" y1="${f(cy * (R + 2.5))}" x2="${f(sx * (R + (major ? 5.5 : 4)))}" y2="${f(cy * (R + (major ? 5.5 : 4)))}" stroke="#ece8dc" stroke-width="${major ? 0.8 : 0.5}"/>`;
      if (d.scale && d.scale[i]) s += `<text x="${f(sx * (R + 10.5))}" y="${f(cy * (R + 10.5))}" font-size="${d.size === 'L' ? 6.2 : 5.4}">${d.scale[i]}</text>`;
    }
    s += `<g class="body"><circle r="${R}" fill="url(#gSkirt)"/><circle r="${f(R * 0.84)}" fill="url(#gBody)" stroke="#000" stroke-width=".5"/>` +
      `<circle r="${f(R * 0.58)}" fill="url(#gCap)" stroke="#4a4a4a" stroke-width=".5"/>` +
      `<g class="ptr"><line y1="${f(-R * 0.6)}" y2="${f(-R * 0.97)}" stroke="#fff" stroke-width="${R > 12 ? 1.8 : 1.4}" stroke-linecap="round"/></g></g></svg>`;
    const c = el('div', 'ctl knob', panel, { left: px(d.x), top: px(d.y) });
    c.innerHTML = s;
    const ptr = c.querySelector('.ptr');
    label(panel, d.x, d.y + R + (d.scale ? 13 : 10) + (d.wrap ? 3 : 0), d.label, { wrap: d.wrap });
    return { dom: c, set: (v) => ptr.setAttribute('transform', `rotate(${f(-135 + 270 * (v - d.min) / (d.max - d.min))})`) };
  }

  function buildRot(panel, d) {
    const R = 13, n = d.pos.length, step = n <= 3 ? 45 : n === 5 ? 36 : 38, sz = 2 * (R + 16);
    const ang = (i) => (i - (n - 1) / 2) * step;
    let s = `<svg width="${sz}" height="${sz}" viewBox="${-sz / 2} ${-sz / 2} ${sz} ${sz}">`;
    d.pos.forEach((t, i) => {
      const a = ang(i) * Math.PI / 180, sx = Math.sin(a), cy = -Math.cos(a);
      s += `<line x1="${f(sx * (R + 2))}" y1="${f(cy * (R + 2))}" x2="${f(sx * (R + 5))}" y2="${f(cy * (R + 5))}" stroke="#ece8dc" stroke-width=".8"/>`;
      s += `<text x="${f(sx * (R + 11))}" y="${f(cy * (R + 10))}" font-size="5.4">${t}</text>`;
    });
    s += `<g class="body"><circle r="${R}" fill="url(#gSkirt)"/><circle r="${R - 2.5}" fill="url(#gBody)" stroke="#000" stroke-width=".5"/>` +
      `<g class="ptr"><rect x="-3.2" y="${-R - 1.5}" width="6.4" height="${2 * R + 3}" rx="2.4" fill="#1a1a1b" stroke="#555" stroke-width=".6"/>` +
      `<line y1="${-R}" y2="-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g></g></svg>`;
    const c = el('div', 'ctl rot', panel, { left: px(d.x), top: px(d.y) });
    c.innerHTML = s;
    const ptr = c.querySelector('.ptr');
    label(panel, d.x, d.y + R + 11, d.label);
    return { dom: c, set: (v) => ptr.setAttribute('transform', `rotate(${ang(v)})`) };
  }

  function buildSw(panel, d) {
    if (d.foot) {
      const led = el('div', 'lamp', panel, { left: px(d.x - 36), top: px(d.y) });
      const c = el('div', 'ctl foot', panel, { left: px(d.x), top: px(d.y) });
      return { dom: c, set: (v) => led.classList.toggle('on', v > 0.5) };
    }
    const n = d.pos.length;
    const c = el('div', 'ctl sw', panel, { left: px(d.x), top: px(d.y) });
    el('i', '', c);
    if (!d.quiet) {
      label(panel, d.x, d.y - 21, d.pos[n - 1]);
      label(panel, d.x, d.y + 21, d.pos[0]);
      if (n === 3 && d.pos[1]) label(panel, d.x + 10, d.y, d.pos[1], { left: true });
      label(panel, d.x, d.y - 30, d.label);
    }
    return { dom: c, set: (v) => c.style.setProperty('--t', px(n === 2 ? (v > 0.5 ? 1 : 15) : [15, 8, 1][v | 0])) };
  }

  function buildBtn(panel, d) {
    const c = el('div', 'ctl btn', panel, { left: px(d.x), top: px(d.y) });
    label(panel, d.x, d.y + 17, d.label);
    return { dom: c, set: (v) => c.classList.toggle('down', v > 0.5) };
  }

  function buildVU(panel, d) {
    const c = el('div', 'vu', panel, { left: px(d.x), top: px(d.y) });
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const a = (-48 + 9.6 * i) * Math.PI / 180, r1 = 50, r2 = i % 5 === 0 ? 57 : 54;
      ticks += `<line x1="${f(55 + Math.sin(a) * r1)}" y1="${f(74 - Math.cos(a) * r1)}" x2="${f(55 + Math.sin(a) * r2)}" y2="${f(74 - Math.cos(a) * r2)}" stroke="${i > 7 ? '#b01' : '#222'}" stroke-width="1"/>`;
    }
    c.innerHTML = `<svg width="110" height="66" viewBox="0 0 110 66"><rect width="110" height="66" rx="3" fill="#0a0a0a" stroke="#555"/>` +
      `<rect x="4" y="4" width="102" height="58" rx="2" fill="#efe6c8"/><clipPath id="vuclip"><rect x="4" y="4" width="102" height="52"/></clipPath>` +
      ticks + `<text x="55" y="48" font-size="8" text-anchor="middle" fill="#333" font-family="serif">VU</text>` +
      `<g clip-path="url(#vuclip)"><line class="needle" x1="55" y1="74" x2="55" y2="18" stroke="#111" stroke-width="1.2" transform="rotate(-48 55 74)"/></g>` +
      `<rect x="4" y="54" width="102" height="8" fill="#1a1a1a"/></svg>`;
    const needle = c.querySelector('.needle');
    let val = 0;
    return (peak) => {
      const t = Math.max(0, Math.min(1, (20 * Math.log10(peak + 1e-5) + 36) / 36));
      val += (t - val) * (t > val ? 0.6 : 0.18);
      needle.setAttribute('transform', `rotate(${f(-48 + 96 * val)} 55 74)`);
    };
  }

  // ---------------------------------------------------------------- panels
  ROWS.forEach((row, r) => {
    const y0 = TOP + r * (PH + GAP);
    el('div', 'rail', cab, { left: px(SIDE - 4), top: px(y0 - 5), width: px(20 * U + 8), height: px(PH + 10) });
    let x0 = SIDE;
    for (const [id, type] of row) x0 += place(cab, id, type, x0, y0);
  });
  // Builds one module (cabinet panel or floor pedal) at rig coordinates x0, y0 and returns its width.
  function place(parent, id, type, x0, y0) {
    {
      const def = TYPES[type], ped = def.pedal, w = ped ? ped.w : def.w * U, h = ped ? ped.h : PH;
      const panel = el('div', ped ? 'panel pedal' : 'panel', parent, { left: px(x0), top: px(y0), width: px(w) });
      if (ped) { panel.style.height = px(h); panel.style.background = ped.bg; }
      panel.dataset.mod = id;
      for (const [sx, sy] of [[5, 5], [w - 12, 5], [5, h - 12], [w - 12, h - 12]]) {
        const s = el('div', 'screw', panel, { left: px(sx), top: px(sy) }); s.style.setProperty('--a', (Math.random() * 180 | 0) + 'deg');
      }
      if (def.name) el('div', 'ptitle', panel).innerHTML = `<b>${def.num}</b>${def.name}`;
      const groups = {};
      for (const d of def.ui) {
        const key = `${id}.${d.id}`;
        if (d.t === 'knob' || d.t === 'rot' || d.t === 'sw' || d.t === 'btn') {
          const c = (d.t === 'knob' ? buildKnob : d.t === 'rot' ? buildRot : d.t === 'sw' ? buildSw : buildBtn)(panel, d);
          c.def = d; controls[key] = c;
          bindControl(key, c);
        } else if (d.t === 'jack') {
          if (d.hidden) continue;
          const j = el('div', 'jack' + (d.kind === 'strig' ? ' strig' : ''), panel, { left: px(d.x), top: px(d.y) });
          j.dataset.jack = key;
          if (d.kind === 'strig') { el('i', 'p1', j); el('i', 'p2', j); }
          jackEls[key] = j; jackPos[key] = { x: x0 + d.x, y: y0 + d.y, kind: d.kind };
          label(panel, d.lx || d.x, d.y - (d.kind === 'strig' ? 15 : 17), d.label);
          if (d.g) (groups[d.g] = groups[d.g] || []).push(d);
        } else if (d.t === 'lamp') {
          lamps[key] = el('div', 'lamp', panel, { left: px(d.x), top: px(d.y) });
          label(panel, d.x, d.y + 13, d.label);
        } else if (d.t === 'text') label(panel, d.x, d.y, d.text, d);
        else if (d.t === 'vu') vus[key] = buildVU(panel, d);
        else if (d.t === 'plate') el('div', 'plate', panel, { left: px(d.x), top: px(d.y) }).innerHTML = '<b>55</b>MODULAR SYSTEM<br>EMULACIÓN WEB';
      }
      for (const g of Object.values(groups)) {
        const xs = g.map((d) => d.x), ys = g.map((d) => d.y);
        el('div', 'multbox', panel, { left: px(Math.min(...xs) - 16), top: px(Math.min(...ys) - 16), width: px(Math.max(...xs) - Math.min(...xs) + 32), height: px(Math.max(...ys) - Math.min(...ys) + 32) });
      }
      return w;
    }
  }

  // ---------------------------------------------------------------- pointer helpers
  const local = (e) => {
    const r = rig.getBoundingClientRect(), s = r.width / RIG_W;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  function drag(e, target, move, up) {
    try { target.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ }
    const mv = (ev) => move(ev);
    const end = (ev) => {
      target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end);
      up && up(ev);
    };
    target.addEventListener('pointermove', mv); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
  }

  function bindControl(key, c) {
    const d = c.def, dom = c.dom;
    dom.dataset.ctl = key;
    dom.addEventListener('contextmenu', (e) => { e.preventDefault(); host.menu(key, e.clientX, e.clientY); });
    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (host.learning()) host.learnSelect(key);
      const v0 = host.getParam(key), y0 = e.clientY;
      if (d.t === 'knob') {
        drag(e, dom, (ev) => host.setParam(key, v0 + (y0 - ev.clientY) * (d.max - d.min) / (ev.shiftKey ? 1500 : 220)));
      } else if (d.t === 'rot') {
        let moved = false;
        drag(e, dom, (ev) => { const dv = Math.round((y0 - ev.clientY) / 16); if (dv) moved = true; host.setParam(key, v0 + dv); },
          () => { if (!moved) host.setParam(key, v0 >= d.max ? 0 : v0 + 1); });
      } else if (d.t === 'sw') {
        if (d.max === 1) host.setParam(key, v0 > 0.5 ? 0 : 1);
        else { const r = dom.getBoundingClientRect(); host.setParam(key, v0 + (e.clientY < r.top + r.height / 2 ? 1 : -1)); }
      } else if (d.t === 'btn') {
        host.setParam(key, 1);
        drag(e, dom, () => {}, () => host.setParam(key, 0));
      }
    });
    if (d.t === 'knob') {
      dom.addEventListener('dblclick', () => host.setParam(key, d.def));
      dom.addEventListener('wheel', (e) => { e.preventDefault(); host.setParam(key, host.getParam(key) - Math.sign(e.deltaY) * (d.max - d.min) / (e.shiftKey ? 1000 : 100)); }, { passive: false });
    } else if (d.t === 'rot') {
      dom.addEventListener('wheel', (e) => { e.preventDefault(); host.setParam(key, host.getParam(key) - Math.sign(e.deltaY)); }, { passive: false });
    }
  }

  // ---------------------------------------------------------------- cables
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'cables'; svg.setAttribute('width', RIG_W); svg.setAttribute('height', RIG_H);
  rig.appendChild(svg);

  const plug = (p, col, strig) => strig
    ? `<rect x="${p.x - 12}" y="${p.y - 8.5}" width="24" height="17" rx="3" fill="url(#gPlug)" stroke="#000"/><rect x="${p.x - 12}" y="${p.y - 2}" width="24" height="4" fill="${col[0]}"/>`
    : `<circle cx="${p.x}" cy="${p.y}" r="9.5" fill="url(#gPlug)" stroke="#000" stroke-width=".8"/><circle cx="${p.x}" cy="${p.y}" r="5.6" fill="none" stroke="${col[0]}" stroke-width="2.4"/><circle cx="${p.x - 2}" cy="${p.y - 2.5}" r="1.6" fill="rgba(255,255,255,.35)"/>`;
  function cablePath(a, b, col, strig) {
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    const sag = Math.max(34, Math.min(170, dist * 0.24 + 30));
    const d = `M${f(a.x)} ${f(a.y)} C${f(a.x + dx * 0.12)} ${f(a.y + sag)} ${f(b.x - dx * 0.12)} ${f(b.y + sag)} ${f(b.x)} ${f(b.y)}`;
    return `<g filter="url(#fCable)"><path d="${d}" fill="none" stroke="#000" stroke-width="7.5" stroke-linecap="round" opacity=".65"/>` +
      `<path d="${d}" fill="none" stroke="${col[0]}" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${col[1]}" stroke-width="1.6" stroke-linecap="round" opacity=".55" transform="translate(-1 -1.2)"/></g>` +
      plug(a, col, strig) + plug(b, col, strig);
  }
  function drawCables() {
    let s = '';
    for (const c of host.cables()) {
      const a = jackPos[c.a], b = jackPos[c.b];
      if (a && b) s += cablePath(a, b, CABLE_COLORS[c.color % CABLE_COLORS.length], a.kind === 'strig');
    }
    if (temp) s += cablePath(temp.from, temp.to, CABLE_COLORS[temp.color % CABLE_COLORS.length], temp.from.kind === 'strig');
    svg.innerHTML = s;
  }

  const occupied = (ref) => host.cables().some((c) => c.a === ref || c.b === ref);
  function canConnect(a, b) {
    if (a === b) return false;
    const da = jackDef(a), db = jackDef(b);
    if (!da || !db || da.kind !== db.kind) return false;
    if (da.dir === 'mult' && db.dir === 'mult') return !(a.split('.')[0] === b.split('.')[0] && da.g === db.g);
    if (da.dir === 'mult' || db.dir === 'mult') return true;
    return da.dir !== db.dir;
  }
  rig.addEventListener('pointerdown', (e) => {
    const j = e.target.closest('.jack');
    if (!j || e.button !== 0) return;
    e.preventDefault();
    const ref = j.dataset.jack;
    const list = host.cables();
    const idx = list.findIndex((c) => c.a === ref || c.b === ref);
    let fixed = ref, color;
    if (idx >= 0) { // unplug this end, keep the other
      const c = list[idx];
      fixed = c.a === ref ? c.b : c.a; color = c.color;
      list.splice(idx, 1); host.cablesChanged();
    } else color = Math.max(colorIdx++, ...list.map((c) => c.color + 1));
    temp = { from: jackPos[fixed], to: local(e), color };
    const hot = Object.keys(jackEls).filter((r) => canConnect(fixed, r) && !occupied(r));
    hot.forEach((r) => jackEls[r].classList.add('hot'));
    drawCables();
    drag(e, j, (ev) => { temp.to = local(ev); drawCables(); }, (ev) => {
      hot.forEach((r) => jackEls[r].classList.remove('hot'));
      temp = null;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const tj = t && t.closest && t.closest('.jack');
      const ref2 = tj && tj.dataset.jack;
      if (ref2 && canConnect(fixed, ref2) && !occupied(ref2)) { list.push({ a: fixed, b: ref2, color }); host.cablesChanged(); }
      drawCables();
    });
  });

  // ---------------------------------------------------------------- keyboard
  const kb = el('div', 'wood', rig, { left: px(0), top: px(KB_TOP), width: px(KB_W), height: px(KB_H) }); kb.id = 'kb';
  const kbp = el('div', '', kb); kbp.id = 'kbpanel';
  kbp.innerHTML = '<b>950</b>Keyboard<br>61 keys · C2–C7<br><br><span>' + t('kbHint') + '</span>';
  const keys = el('div', '', kb, { left: px(22 + 150 + 14), width: px(36 * 24) }); keys.id = 'keys';
  {
    let wx = 0;
    for (let n = KB_LOW; n < KB_LOW + KB_KEYS; n++) {
      const black = [1, 3, 6, 8, 10].includes(n % 12);
      const k = el('div', 'key ' + (black ? 'b' : 'w'), keys, { left: px(black ? wx - 7 : wx) });
      k.dataset.note = n; keyEls[n] = k;
      if (!black) wx += 24;
    }
    let cur = null;
    const at = (e) => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.dataset && t.dataset.note ? +t.dataset.note : null; };
    const go = (n) => { if (n === cur) return; if (cur != null) host.noteOff(cur); cur = n; if (n != null) host.noteOn(n, 0.8); };
    keys.addEventListener('pointerdown', (e) => { e.preventDefault(); go(at(e)); drag(e, keys, (ev) => go(at(ev)), () => go(null)); });
  }

  PEDALS.forEach(([id, type], i) => place(rig, id, type, KB_W + 16 + i * 167, KB_TOP));
  drawCables();

  return {
    setControl(key, v) { const c = controls[key]; if (c) c.set(v); },
    controls, drawCables,
    setKey(n, on) { const k = keyEls[n]; if (k) k.classList.toggle('on', on); },
    setState(st) {
      const lamp = (k, on) => lamps[k] && lamps[k].classList.toggle('on', !!on);
      if (st.seq) { for (let i = 0; i < 9; i++) lamp('seq.l' + (i + 1), st.seq[0] === i); lamp('seq.run', st.seq[1]); }
      if (st.sw) for (let i = 0; i < 3; i++) lamp('sw.l' + (i + 1), st.sw[0] === i);
      if (st.kbd) lamp('kbd.gate', st.kbd[0]);
      if (st.kbd2) lamp('kbd2.gate', st.kbd2[0]);
      if (vus['out.vu']) vus['out.vu'](st.out ? st.out[0] : 0);
    },
    markLearn(key) { for (const [k, c] of Object.entries(controls)) c.dom.classList.toggle('learnsel', k === key); },
    markMapped(set) { for (const [k, c] of Object.entries(controls)) c.dom.classList.toggle('mapped', set.has(k)); },
    nextColor: () => colorIdx++,
  };
}
