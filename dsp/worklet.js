import { Engine } from './engine.js';

class System55Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.engine = null;
    this.frames = 0;
    this.port.onmessage = (e) => {
      const d = e.data, en = this.engine;
      if (d.type === 'init') {
        this.engine = new Engine(sampleRate, d.system);
        for (const [m, n, v] of d.params) this.engine.setParam(m, n, v, true);
        this.engine.setPatch(d.wires);
        return;
      }
      if (!en) return;
      switch (d.type) {
        case 'param': en.setParam(d.m, d.p, d.v, d.j); break;
        case 'params': for (const [m, n, v] of d.params) en.setParam(m, n, v, true); break;
        case 'patch': en.setPatch(d.wires); break;
        case 'on': en.noteOn(d.n, d.v, d.k | 0); break;
        case 'off': en.noteOff(d.n, d.k | 0); break;
        case 'alloff': en.allOff(); break;
        case 'ctl': en.ctl(d.k, d.v); break;
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!this.engine) return true;
    this.engine.process(out[0], out[1] || new Float32Array(out[0].length));
    this.frames += out[0].length;
    if (this.frames >= sampleRate / 30) {
      this.frames = 0;
      this.port.postMessage({ type: 'state', state: this.engine.state() });
    }
    return true;
  }
}
registerProcessor('system55', System55Processor);
