// src/components/midi-handler.js (browser)
(function () {
  class MIDIHandler {
    constructor() {
      this.inputs = [];
      this.listeners = {};
      this.selected = null;
      this.debounceWindowMs = 5;
      this.recent = new Map();
    }
    on(evt, cb){ if(!this.listeners[evt]) this.listeners[evt]=[]; this.listeners[evt].push(cb); }
    emit(evt,data){ (this.listeners[evt]||[]).forEach(cb=>{ try{cb(data)}catch(e){console.warn(e)} }); }
    async init() {
      if (!navigator.requestMIDIAccess) throw new Error("WebMIDI not available");
      const access = await navigator.requestMIDIAccess({ sysex:false });
      this._attach(access);
      access.onstatechange = () => this._attach(access);
    }
    _attach(access) {
      this.inputs = [];
      for (let input of access.inputs.values()) {
        this.inputs.push({ id: input.id, name: input.name, manufacturer: input.manufacturer });
        input.onmidimessage = ev => this._onMsg(ev);
      }
      this.emit("devices", this.inputs);
    }
    listInputs(){ return this.inputs; }
    selectInput(id){ this.selected = id; return id; }
    _onMsg(ev) {
      const d = ev.data;
      if (!d || d.length < 1) return;
      const status = d[0], type = status & 0xf0, ch = status & 0x0f;
      const note = d[1]||0, vel = d[2]||0;
      const now = performance.now();
      const key = `${type}_${note}_${vel}`;
      const last = this.recent.get(key) || 0;
      if (now - last < this.debounceWindowMs) return;
      this.recent.set(key, now);
      if (type === 0x90 && vel>0) this.emit("noteon",{note,velocity:vel,channel:ch});
      else if (type === 0x80 || (type===0x90 && vel===0)) this.emit("noteoff",{note,velocity:vel,channel:ch});
      else this.emit("raw",{data:d});
    }
  }
  if (typeof window !== "undefined") window.MIDIHandler = MIDIHandler;
  if (typeof module !== "undefined" && module.exports) module.exports = MIDIHandler;
})();