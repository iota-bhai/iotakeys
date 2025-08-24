/*
 src/components/practice-engine.js
 Exposes PracticeEngine and ClockService to window.* (browser friendly)
*/
(function () {
  class ClockService {
    constructor() { this.audioCtx = null; }
    init() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    now() { this.init(); return this.audioCtx.currentTime; }
  }

  class PracticeEngine {
    constructor(opts = {}) {
      this.clock = new ClockService();
      this.arrangement = null;
      this.isPlaying = false;
      this.startTime = 0;
      this.lookahead = opts.lookahead || 0.6;
      this.scheduleInterval = opts.scheduleInterval || 60; // ms
      this.onScore = opts.onScore || function () {};
    }

    loadArrangement(arr) { this.arrangement = arr; }

    start() {
      if (!this.arrangement || !Array.isArray(this.arrangement.notes)) throw new Error("No arrangement loaded");
      this.startTime = this.clock.now() + 0.05;
      this.isPlaying = true;
      this._interval = setInterval(() => this._tick(), this.scheduleInterval);
    }

    stop() {
      this.isPlaying = false;
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
    }

    _tick() {
      if (!this.isPlaying) return;
      const now = this.clock.now();
      const rel = now - this.startTime;
      const upcoming = (this.arrangement.notes || []).filter(n => n.start >= rel && n.start < rel + this.lookahead);
      upcoming.forEach(n => {
        // schedule audio via window.__robust if available
        if (window.__robust && window.__robust.playNoteAt) {
          window.__robust.playNoteAt({ midi: n.pitch, velocity: n.velocity || 90, time: this.startTime + n.start, duration: n.duration || 0.6 });
        } else if (window.__robust && window.__robust.playNote) {
          window.__robust.playNote({ midi: n.pitch, velocity: n.velocity || 90, duration: n.duration || 0.6 });
        }
      });
    }
  }

  if (typeof window !== "undefined") {
    window.PracticeEngine = PracticeEngine;
    window.ClockService = ClockService;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { PracticeEngine, ClockService };
  }
})();