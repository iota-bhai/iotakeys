/* src/renderer/renderer.js
   - Toasts + audio unlock
   - When loadProject returns, auto-create PracticeEngine (if available) and load arrangement
   - Difficulty selector updates the practice engine
*/
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Renderer booting...");

  (function createToastContainer() {
    if (document.getElementById("__toast_container")) return;
    const c = document.createElement("div");
    c.id = "__toast_container";
    c.style.position = "fixed";
    c.style.right = "16px";
    c.style.bottom = "20px";
    c.style.zIndex = "99999";
    c.style.maxWidth = "360px";
    c.style.pointerEvents = "none";
    document.body.appendChild(c);
  })();
  function toast(msg, ms = 3000) {
    const c = document.getElementById("__toast_container");
    if (!c) { console.log("Toast:", msg); return; }
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.background = "rgba(15,20,25,0.95)";
    el.style.color = "#e6eef6";
    el.style.padding = "8px 12px";
    el.style.marginTop = "8px";
    el.style.borderRadius = "8px";
    el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.6)";
    el.style.fontSize = "13px";
    el.style.opacity = "0";
    el.style.transition = "opacity 180ms ease, transform 180ms ease";
    el.style.transform = "translateY(6px)";
    el.style.pointerEvents = "auto";
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0px)"; });
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; setTimeout(()=> el.remove(), 220); }, ms);
  }

  // audio unlock
  async function ensureAudioUnlocked() {
    if (window.__audioUnlocked) return;
    try {
      if (window.__robust && typeof window.__robust.resume === "function") await window.__robust.resume();
      else if (window.__robust && window.__robust.ctx && window.__robust.ctx.state === "suspended") await window.__robust.ctx.resume();
      else if (window.AudioContext || window.webkitAudioContext) { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") await ctx.resume(); } catch(e){} }
    } catch (e) { console.warn("Audio unlock failed:", e); }
    window.__audioUnlocked = true;
    document.removeEventListener("pointerdown", unlockListener);
    document.removeEventListener("keydown", unlockListener);
  }
  const unlockListener = () => { ensureAudioUnlocked().catch(()=>{}); };
  document.addEventListener("pointerdown", unlockListener, { once: false });
  document.addEventListener("keydown", unlockListener, { once: false });

  // try to init audio engine
  if (window.RobustAudioEngine) {
    try { window.__robust = new window.RobustAudioEngine(); if (typeof window.__robust.init === "function") window.__robust.init(); console.log("RobustAudioEngine initialized"); } catch(e){ console.warn("Audio init failed", e); }
  }

  // init piano (61 keys)
  const pianoContainer = document.getElementById("piano-panel");
  if (window.PianoComponent && pianoContainer) {
    try {
      window._piano = new window.PianoComponent(pianoContainer, { lowestMidi: 36, keyCount: 61 });
      window._piano.onClick(async (midi) => { await ensureAudioUnlocked(); if (window.__robust && window.__robust.playNote) window.__robust.playNote({ midi, velocity:100, duration:0.8 }); });
      console.log("Piano ready");
    } catch(e){ console.warn("Piano init error", e); }
  }

  // MIDI manager
  if (window.AdvancedMIDIManager) {
    try {
      window._adv = new window.AdvancedMIDIManager();
      await window._adv.init();
      window._adv.on("devicesUpdated", d => console.log("MIDI devices", d));
      window._adv.on("midiMessage", async (m) => {
        if (m.type === "noteOn") {
          if (window._piano) { window._piano.setKeyHold(m.note, true); window._piano.highlightKey(m.note, 0.95, 9999); }
          await ensureAudioUnlocked();
          if (window.__robust && window.__robust.playNote) window.__robust.playNote({ midi: m.note, velocity: m.velocity || 90, duration: 0.6 });
        } else if (m.type === "noteOff") {
          if (window._piano) window._piano.setKeyHold(m.note, false);
        }
      });
      console.log("AdvancedMIDIManager ready");
    } catch(e){ console.warn("AdvancedMIDIManager init failed", e); }
  }

  // UI wiring
  const $ = (id) => document.getElementById(id);
  const btnOpen = $("btn-open"), btnNew = $("btn-new"), btnImport = $("btn-import");
  const btnPlay = $("btn-play"), btnPause = $("btn-pause"), btnStop = $("btn-stop");
  const btnGenerate = $("btn-generate"), btnConnectMidi = $("btn-connect-midi");
  const difficultySelect = $("difficulty-select");

  // Internal: when a project is loaded, set up practice engine if available
  async function onProjectLoaded(result) {
    if (!result || !result.project) return;
    const project = result.project;
    window.__currentProject = project;
    toast("Project loaded: " + (project.title || "project"), 2200);
    console.log("Project details:", project);

    // Find an arrangement object for the selected difficulty
    const diff = (difficultySelect && difficultySelect.value) ? difficultySelect.value : "easy";
    let arrangement = null;
    if (project._arrangements && typeof project._arrangements === "object") {
      if (project._arrangements[diff] && typeof project._arrangements[diff] === "object" && !project._arrangements[diff].error) {
        arrangement = project._arrangements[diff];
      } else {
        // pick any available arrangement object
        const keys = Object.keys(project._arrangements);
        for (const k of keys) {
          if (project._arrangements[k] && !project._arrangements[k].error) { arrangement = project._arrangements[k]; break; }
        }
      }
    } else if (project.arrangements && typeof project.arrangements === "object") {
      // if arrangements are inline objects
      const keys = Object.keys(project.arrangements);
      if (keys.length > 0) arrangement = project.arrangements[keys[0]];
    }

    if (arrangement && window.PracticeEngine) {
      try {
        window.__practice = new window.PracticeEngine();
        window.__practice.loadArrangement(arrangement);
        toast("Practice engine ready (difficulty: " + diff + ")", 2200);
      } catch (e) { console.warn("PracticeEngine init failed", e); toast("Practice engine unavailable", 2000); }
    } else {
      console.log("No arrangement found to load into PracticeEngine.");
    }
  }

  // Open project button
  if (btnOpen) btnOpen.addEventListener("click", async () => {
    try {
      if (!window.api || !window.api.openFolder) return toast("Dialog API missing", 2200);
      const res = await window.api.openFolder();
      if (res.canceled) return;
      const folder = res.filePaths[0];
      const loadRes = await window.api.loadProject(folder);
      if (!loadRes.ok) { toast("Load failed: " + loadRes.error, 4000); return; }
      await onProjectLoaded(loadRes);
    } catch (e) { toast("Open project error: " + e.message, 4000); console.warn(e); }
  });

  // Generate variants button
  if (btnGenerate) btnGenerate.addEventListener("click", async () => {
    try {
      if (!window.api || !window.api.openFile) return toast("Dialog API missing", 2200);
      const pick = await window.api.openFile([{ name: "MIDI", extensions: ["mid","midi"] }]);
      if (pick.canceled) return;
      const midiPath = pick.filePaths[0];
      const folderRes = await window.api.openFolder();
      if (folderRes.canceled) return;
      const projectDir = folderRes.filePaths[0];
      toast("Generating variants...", 2500);
      const genRes = await window.api.generateVariants({ projectDir, inputMidiPath: midiPath, options: {} });
      if (!genRes.ok) { toast("Generation failed: " + genRes.error, 4000); console.warn(genRes); return; }
      toast("Variants created in folder: " + projectDir, 3000);
    } catch (e) { toast("Generation error: " + e.message, 4000); console.warn(e); }
  });

  // Play / Pause / Stop
  if (btnPlay) btnPlay.addEventListener("click", async () => {
    await ensureAudioUnlocked();
    try {
      if (window.PracticeEngine && window.__practice) {
        window.__practice.start();
        toast("Playing", 1200);
      } else toast("No practice arrangement loaded", 1500);
    } catch (e) { toast("Play error: " + e.message, 3000); console.warn(e); }
  });
  if (btnPause) btnPause.addEventListener("click", () => { try { if (window.__practice) { window.__practice.stop(); toast("Paused", 1200); } else toast("Pause pressed", 1200); } catch(e){ toast("Pause error: "+e.message,3000); }});
  if (btnStop) btnStop.addEventListener("click", () => { try { if (window.__practice) window.__practice.stop(); toast("Stopped",1200); } catch(e){ toast("Stop error:"+e.message,3000); }});

  // Connect MIDI (scan)
  if (btnConnectMidi) btnConnectMidi.addEventListener("click", async () => {
    try { if (window._adv && window._adv.scanDevices) { window._adv.scanDevices(); toast("Scanning MIDI devices...", 1200); } else toast("MIDI manager not available", 1200); } catch(e) { toast("Connect MIDI error: " + e.message, 3000); }
  });

  // difficulty select changes: reload practice arrangement if any
  if (difficultySelect) difficultySelect.addEventListener("change", () => {
    if (!window.__currentProject) return;
    const diff = difficultySelect.value;
    // try to find arrangement and reload
    const proj = window.__currentProject;
    let arr = null;
    if (proj._arrangements && proj._arrangements[diff] && !proj._arrangements[diff].error) arr = proj._arrangements[diff];
    else if (proj._arrangements) {
      const keys = Object.keys(proj._arrangements);
      if (keys.length) arr = proj._arrangements[keys[0]];
    }
    if (arr && window.__practice) {
      try { window.__practice.loadArrangement(arr); toast("Loaded arrangement: " + diff, 1200); } catch(e) { console.warn(e); }
    }
  });

  console.log("Renderer ready and toolbar wired.");
});