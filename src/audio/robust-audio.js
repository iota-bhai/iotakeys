// src/audio/robust-audio.js
(function () {
  class RobustAudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
    }
    init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    async resume() {
      this.init();
      try {
        if (this.ctx && this.ctx.state === "suspended") {
          await this.ctx.resume();
          console.log("AudioContext resumed");
        }
      } catch (e) {
        console.warn("Failed to resume AudioContext:", e);
      }
    }
    playNote({ midi = 60, velocity = 90, duration = 0.8 }) {
      this.init();
      if (!this.ctx) return;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = (velocity / 127) * 0.6;
      o.connect(g);
      g.connect(this.master);
      const t = this.ctx.currentTime;
      o.start(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.stop(t + duration + 0.05);
    }
    playNoteAt({ midi = 60, velocity = 90, time = 0, duration = 0.8 }) {
      this.init();
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = (velocity / 127) * 0.6;
      o.connect(g); g.connect(this.master);
      o.start(time);
      g.gain.setValueAtTime(g.gain.value, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      o.stop(time + duration + 0.1);
    }
  }

  if (typeof window !== "undefined") window.RobustAudioEngine = RobustAudioEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = RobustAudioEngine;
})();