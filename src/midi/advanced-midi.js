// src/midi/advanced-midi.js
// Browser-side AdvancedMIDIManager using WebMIDI (exposes window.AdvancedMIDIManager).
// Provides recording/playback and a safe MIDI->MIDI file exporter (uses PPQ ticks conversion).

(function () {
  class AdvancedMIDIManager {
    constructor() {
      this.midiAccess = null;
      this.inputDevices = new Map();
      this.outputDevices = new Map();
      this.isRecording = false;
      this.recordedEvents = [];
      this.recordStartTime = null;
      this.playbackEvents = [];
      this.isPlaying = false;
      this.playbackStartTime = null;
      this.tempo = 120;
      this.eventCallbacks = new Map();
      this.quantization = 16; // 16th notes
      this.PPQ = 480; // ticks per quarter note for file export
      // Note: do NOT auto-init in constructor; call init() explicitly to handle permission prompts in UI
    }

    async init() {
      if (!navigator.requestMIDIAccess) {
        throw new Error("Web MIDI API not available in this environment.");
      }
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        this.scanDevices();
        this.midiAccess.onstatechange = () => this.scanDevices();
        this.emit("ready");
        console.log("AdvancedMIDIManager: initialized");
      } catch (err) {
        console.error("AdvancedMIDIManager init failed:", err);
        throw err;
      }
    }

    scanDevices() {
      this.inputDevices.clear();
      this.outputDevices.clear();

      if (!this.midiAccess) return;

      for (let input of this.midiAccess.inputs.values()) {
        this.inputDevices.set(input.id, input);
        input.onmidimessage = (event) => this.handleMIDIMessage(event);
        console.log("MIDI Input:", input.name || input.id);
      }
      for (let output of this.midiAccess.outputs.values()) {
        this.outputDevices.set(output.id, output);
        console.log("MIDI Output:", output.name || output.id);
      }

      this.emit("devicesUpdated", {
        inputs: Array.from(this.inputDevices.values()).map(i=>({id:i.id, name:i.name, manufacturer:i.manufacturer})),
        outputs: Array.from(this.outputDevices.values()).map(o=>({id:o.id, name:o.name, manufacturer:o.manufacturer}))
      });
    }

    handleMIDIMessage(event) {
      const d = event.data;
      if (!d || d.length < 1) return;
      const status = d[0];
      const messageType = status & 0xf0;
      const channel = status & 0x0f;
      const note = d.length > 1 ? d[1] : 0;
      const velocity = d.length > 2 ? d[2] : 0;
      const timestamp = (typeof event.timeStamp === "number" && event.timeStamp > 0) ? event.timeStamp : performance.now();

      const midiEvent = {
        type: this.getMIDIMessageType(messageType, velocity),
        channel,
        note,
        velocity,
        timestamp,
        deltaTime: this.isRecording && this.recordStartTime ? timestamp - this.recordStartTime : 0
      };

      if (this.isRecording) this.recordedEvents.push(midiEvent);
      this.emit("midiMessage", midiEvent);
    }

    getMIDIMessageType(status, velocity) {
      switch (status) {
        case 0x90: return velocity > 0 ? "noteOn" : "noteOff";
        case 0x80: return "noteOff";
        case 0xB0: return "controlChange";
        case 0xC0: return "programChange";
        case 0xE0: return "pitchBend";
        default: return "unknown";
      }
    }

    startRecording(options = {}) {
      this.isRecording = true;
      this.recordedEvents = [];
      this.recordStartTime = performance.now();
      this.recordingOptions = {
        quantize: options.quantize || false,
        metronome: options.metronome || false,
        countIn: options.countIn || 0
      };
      this.emit("recordingStarted");
      if (this.recordingOptions.countIn > 0) {
        // count-in handled by UI if desired
      }
    }

    stopRecording() {
      this.isRecording = false;
      const duration = this.recordStartTime ? (performance.now() - this.recordStartTime) : 0;
      const recording = {
        events: [...this.recordedEvents],
        duration,
        tempo: this.tempo,
        recordedAt: new Date().toISOString()
      };
      if (this.recordingOptions && this.recordingOptions.quantize) {
        recording.events = this.quantizeEvents(recording.events);
      }
      this.emit("recordingStopped", recording);
      return recording;
    }

    quantizeEvents(events) {
      const quantMs = (60 / this.tempo / this.quantization) * 1000;
      return events.map(ev => ({ ...ev, deltaTime: Math.round(ev.deltaTime / quantMs) * quantMs }));
    }

    playRecording(recording, options = {}) {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.playbackOptions = { loop: options.loop || false, speed: options.speed || 1.0, outputDeviceId: options.outputDeviceId || null };
      this.playbackEvents = recording.events.map(e => ({ ...e, played: false }));
      this.playbackStartTime = performance.now();
      this._schedulePlayback();
      this.emit("playbackStarted");
    }

    _schedulePlayback() {
      if (!this.isPlaying) return;
      const now = performance.now();
      const elapsed = (now - this.playbackStartTime) * this.playbackOptions.speed;
      for (let ev of this.playbackEvents) {
        if (!ev.played && ev.deltaTime <= elapsed) {
          this._sendMIDIOut(ev);
          ev.played = true;
        }
      }
      // loop if needed
      const allPlayed = this.playbackEvents.every(e => e.played);
      if (allPlayed && this.playbackOptions.loop) {
        this.playbackEvents.forEach(e => e.played = false);
        this.playbackStartTime = performance.now();
      }
      if (this.isPlaying) requestAnimationFrame(() => this._schedulePlayback());
    }

    _sendMIDIOut(ev) {
      let output = null;
      if (this.playbackOptions.outputDeviceId && this.outputDevices.has(this.playbackOptions.outputDeviceId)) {
        output = this.outputDevices.get(this.playbackOptions.outputDeviceId);
      } else {
        // pick first available
        const it = this.outputDevices.values();
        output = it ? it.next().value : null;
      }
      if (!output) return;
      let status;
      switch (ev.type) {
        case "noteOn": status = 0x90 | (ev.channel & 0x0f); break;
        case "noteOff": status = 0x80 | (ev.channel & 0x0f); break;
        case "controlChange": status = 0xB0 | (ev.channel & 0x0f); break;
        default: return;
      }
      const data = new Uint8Array([status, ev.note & 0x7f, ev.velocity & 0x7f]);
      try { output.send(Array.from(data)); } catch (e) { console.warn("MIDI send failed:", e); }
    }

    stopPlayback() {
      this.isPlaying = false;
      this.emit("playbackStopped");
    }

    // ---------- MIDI File export (simple, uses PPQ conversion) ----------
    exportToMIDI(recording) {
      // Returns Uint8Array of MIDI file data
      const header = this._midiHeaderChunk();
      const trackEvents = this._encodeTrackEvents(recording.events, recording.tempo || this.tempo);
      const trackLen = trackEvents.length;
      const trackHeader = this._trackHeaderChunk(trackLen);
      const out = new Uint8Array(header.length + trackHeader.length + trackEvents.length);
      out.set(header, 0);
      out.set(trackHeader, header.length);
      out.set(trackEvents, header.length + trackHeader.length);
      return out;
    }

    _midiHeaderChunk() {
      // Format 1, one track, PPQ = this.PPQ
      const arr = [
        0x4d,0x54,0x68,0x64, // "MThd"
        0x00,0x00,0x00,0x06, // header length
        0x00,0x01, // format 1
        0x00,0x01, // one track (we write single track)
        (this.PPQ >> 8) & 0xff, this.PPQ & 0xff
      ];
      return new Uint8Array(arr);
    }

    _trackHeaderChunk(len) {
      const header = [0x4d,0x54,0x72,0x6b]; // "MTrk"
      const lenBytes = this._int32ToBytes(len);
      return new Uint8Array(header.concat(lenBytes));
    }

    _encodeTrackEvents(events, tempoBpm) {
      // Convert each event.deltaTime (ms) to ticks
      // ticks = seconds * (bpm/60) * PPQ
      const encoded = [];
      let lastTick = 0;
      for (let ev of events) {
        const seconds = (ev.deltaTime || 0) / 1000.0;
        const ticks = Math.round(seconds * ( (tempoBpm || this.tempo) / 60.0 ) * this.PPQ);
        const deltaTicks = Math.max(0, ticks - lastTick);
        const deltaBytes = this._encodeVariableLength(deltaTicks);
        encoded.push(...deltaBytes);
        // event bytes
        if (ev.type === "noteOn") {
          encoded.push(0x90 | (ev.channel & 0x0f), ev.note & 0x7f, ev.velocity & 0x7f);
        } else if (ev.type === "noteOff") {
          encoded.push(0x80 | (ev.channel & 0x0f), ev.note & 0x7f, ev.velocity & 0x7f);
        } else if (ev.type === "controlChange") {
          encoded.push(0xB0 | (ev.channel & 0x0f), ev.cc & 0x7f, ev.value & 0x7f);
        }
        lastTick = ticks;
      }
      // End of track meta event
      encoded.push(0x00, 0xFF, 0x2F, 0x00);
      return new Uint8Array(encoded);
    }

    _encodeVariableLength(value) {
      // Standard MIDI variable length
      const parts = [];
      let buffer = value & 0x7f;
      value >>= 7;
      while (value > 0) {
        parts.unshift(0x80 | buffer);
        buffer = value & 0x7f;
        value >>= 7;
      }
      parts.unshift(buffer);
      return parts;
    }

    _int32ToBytes(v) {
      return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    }

    // Event subscription
    on(name, cb) {
      if (!this.eventCallbacks.has(name)) this.eventCallbacks.set(name, []);
      this.eventCallbacks.get(name).push(cb);
    }
    emit(name, data) {
      if (!this.eventCallbacks.has(name)) return;
      for (const cb of this.eventCallbacks.get(name)) {
        try { cb(data); } catch (e) { console.warn("callback error", e); }
      }
    }
  }

  // Export to window for renderer usage
  if (typeof window !== "undefined") window.AdvancedMIDIManager = AdvancedMIDIManager;
  if (typeof module !== "undefined" && module.exports) module.exports = AdvancedMIDIManager;
})();