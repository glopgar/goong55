// Web MIDI: notes / bend / mod wheel / pressure to the keyboard controller, and
// learnable assignment of any hardware control (CC, pitch bend, channel pressure) to any panel control.
import { t } from './i18n.js';

const LS = 's55.midimap';

export const srcLabel = (src) => {
  const [t, ch, n] = src.split(':');
  const c = t('channel', +ch + 1);
  return t === 'cc' ? `CC ${n}${c}` : t === 'pb' ? `Pitch bend${c}` : `Aftertouch${c}`;
};

export class Midi {
  constructor(host) {
    this.host = host;
    this.maps = {};
    try { this.maps = JSON.parse(localStorage.getItem(LS)) || {}; } catch { /* no stored map */ }
    this.input = 'all'; this.channel = -1; this.channelB = 1; // voice B listens on MIDI channel 2 by default
     this.learnKey = null; this.access = null;
  }
  save() { try { localStorage.setItem(LS, JSON.stringify(this.maps)); } catch { /* storage unavailable */ } }
  async init() {
    if (!navigator.requestMIDIAccess) return false;
    try { this.access = await navigator.requestMIDIAccess({ sysex: false }); } catch { return false; }
    this.access.onstatechange = () => this.bind();
    this.bind();
    return true;
  }
  devices() {
    const list = [];
    if (this.access) for (const inp of this.access.inputs.values()) list.push({ id: inp.id, name: inp.name || inp.id });
    return list;
  }
  bind() {
    for (const inp of this.access.inputs.values()) inp.onmidimessage = (e) => this.onMsg(inp, e.data);
    this.host.midiDevices(this.devices());
  }
  unmap(key) { delete this.maps[key]; this.save(); }
  clear() { this.maps = {}; this.save(); }
  onMsg(inp, data) {
    if (this.input !== 'all' && inp.id !== this.input) return;
    const st = data[0], d1 = data[1] || 0, d2 = data[2] || 0;
    if (st >= 0xf0) return;
    const type = st & 0xf0, ch = st & 15;
    let src = null, x = 0, desc = '';
    if (type === 0xb0) { src = `cc:${ch}:${d1}`; x = d2 / 127; desc = `CC ${d1} = ${d2}`; }
    else if (type === 0xe0) { src = `pb:${ch}`; x = ((d2 << 7) | d1) / 16383; desc = `Bend ${((d2 << 7) | d1) - 8192}`; }
    else if (type === 0xd0) { src = `at:${ch}`; x = d1 / 127; desc = `Pressure ${d1}`; }
    else if (type === 0x90 || type === 0x80) desc = `Note ${d1} ${type === 0x90 && d2 ? 'on' : 'off'}`;
    else return;
    this.host.midiMonitor(`${desc} · ch ${ch + 1}`);
    if (src) {
      if (this.learnKey) {
        const key = this.learnKey;
        this.learnKey = null;
        this.maps[key] = src; this.save();
        this.host.learned(key, src);
        this.host.midiControl(key, x);
        return;
      }
      let hit = false;
      for (const key in this.maps) if (this.maps[key] === src) { this.host.midiControl(key, x); hit = true; }
      if (hit) return;
    }
    const k = ch === this.channelB ? 1 : 0;
    if (!k && this.channel >= 0 && ch !== this.channel) return;
    if (type === 0x90 && d2 > 0) this.host.noteOn(d1, d2 / 127, k);
    else if (type === 0x90 || type === 0x80) this.host.noteOff(d1, k);
    else if (k) { if (type === 0xb0 && (d1 === 120 || d1 === 123)) this.host.panic(); } // voice B: notes only
    else if (type === 0xe0) this.host.ctl('bend', x * 2 - 1);
    else if (type === 0xd0) this.host.ctl('at', x);
    else if (type === 0xb0) {
      if (d1 === 1) this.host.ctl('mod', x);
      else if (d1 === 120 || d1 === 123) this.host.panic();
    }
  }
}
