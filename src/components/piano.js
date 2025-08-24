// src/components/piano.js - 61-key piano (browser)
(function(){
  class PianoComponent {
    constructor(container, opts={}) {
      this.container = (typeof container === "string") ? document.querySelector(container) : container;
      if (!this.container) throw new Error("Piano container missing");
      this.lowestMidi = opts.lowestMidi || 36;
      this.keyCount = opts.keyCount || 61;
      this.dpr = window.devicePixelRatio || 1;
      this.canvas = document.createElement("canvas");
      this.canvas.style.width = "100%";
      this.canvas.style.height = "120px";
      this.ctx = this.canvas.getContext("2d");
      this.container.innerHTML = "";
      this.container.appendChild(this.canvas);
      this.keys = []; this.pressed = new Map(); this.highlighted = new Map(); this.clickHandlers=[];
      this._initResize();
      this.canvas.addEventListener("pointerdown", (e)=>this._onPointer(e));
    }
    _initResize(){
      const ro = new ResizeObserver(()=>this._resize()); ro.observe(this.container); this._resize();
    }
    _resize(){
      const rect = this.container.getBoundingClientRect();
      const w = rect.width, h = Math.max(120, rect.height);
      this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
      this.keyWidth = (this.canvas.width/this.dpr)/this.keyCount; this.keyHeight = this.canvas.height/this.dpr;
      this._computeKeys(); this._render();
    }
    _computeKeys(){
      this.keys=[]; for(let i=0;i<this.keyCount;i++){ const midi=this.lowestMidi+i; const x=i*this.keyWidth; const noteInOct=midi%12; const isBlack=[1,3,6,8,10].includes(noteInOct); this.keys.push({midi,x,w:this.keyWidth,isBlack}); }
    }
    _render(){
      const ctx=this.ctx; ctx.clearRect(0,0,this.canvas.width,this.canvas.height); ctx.save(); ctx.scale(this.dpr,this.dpr);
      // white keys
      for (let k of this.keys) if(!k.isBlack){ ctx.fillStyle="#ffffff"; ctx.fillRect(k.x,0,k.w-1,this.keyHeight); ctx.strokeStyle="#bbb"; ctx.strokeRect(k.x,0,k.w-1,this.keyHeight); }
      // pressed white highlight
      for (let [m,info] of this.pressed.entries()){ const idx=m-this.lowestMidi; if(idx>=0 && idx<this.keys.length){ const k=this.keys[idx]; ctx.fillStyle="rgba(80,180,255,0.28)"; ctx.fillRect(k.x,0,k.w-1,this.keyHeight); } }
      // black keys
      for (let k of this.keys) if(k.isBlack){ const bw=Math.round(k.w*0.65); const bx=k.x + k.w*0.7 - bw/2; ctx.fillStyle="#111"; ctx.fillRect(bx,0,bw,this.keyHeight*0.62); ctx.strokeStyle="#222"; ctx.strokeRect(bx,0,bw,this.keyHeight*0.62); }
      // extra highlights
      for (let [m,h] of this.highlighted.entries()){ const idx=m-this.lowestMidi; if(idx>=0 && idx<this.keys.length){ const k=this.keys[idx]; const alpha=Math.max(0,Math.min(1,h.intensity||0.6)); ctx.fillStyle=`rgba(255,220,80,${alpha})`; ctx.fillRect(k.x,0,k.w-1,this.keyHeight); } }
      ctx.restore();
    }
    _onPointer(e){
      const rect=this.canvas.getBoundingClientRect(); const x=(e.clientX-rect.left); const idx=Math.floor(x/this.keyWidth); const k=this.keys[idx]; if(!k) return;
      const midi=k.midi; this.clickHandlers.forEach(cb=>{ try{cb(midi)}catch(e){console.warn(e)} });
      this.highlightKey(midi,0.6,250);
      // attempt to play via global audio engine
      if (window.__robust && window.__robust.playNote) window.__robust.playNote({midi,velocity:100,duration:0.8});
    }
    onClick(cb){ this.clickHandlers.push(cb); }
    setPressedNotes(arr){ this.pressed.clear(); arr.forEach(n=>this.pressed.set(n.note,n)); this._render(); }
    highlightKey(midi,intensity=0.6,durationMs=400){ this.highlighted.set(midi,{intensity,expires:performance.now()+durationMs}); this._render(); setTimeout(()=>{ this.highlighted.delete(midi); this._render(); }, durationMs+20); }
    setKeyHold(midi,hold){ if(hold) this.highlighted.set(midi,{intensity:0.95,expires:Infinity}); else this.highlighted.delete(midi); this._render(); }
  }

  if (typeof window !== "undefined") window.PianoComponent = PianoComponent;
  if (typeof module !== "undefined" && module.exports) module.exports = PianoComponent;
})();