// IotaKeys Ultimate Professional Renderer - Fixed
class IotaKeysApp {
    constructor() {
        this.currentProject = null;
        this.midiAccess = null;
        this.isPlaying = false;
        this.tempo = 120;
        this.score = 0;
        this.accuracy = 0;
        this.totalNotes = 0;
        this.hitNotes = 0;
        this.fallingNotes = [];
        this.audioContext = null;
        this.vexRenderer = null;
        this.metronomeEnabled = false;
        this.sustainEnabled = false;
        this.velocityEnabled = true;
        
        this.init();
    }

    async init() {
        try {
            this.setStatus('Initializing...', 'warn');
            await this.initializeAudio();
            await this.initializeMIDI();
            this.initializeVexFlow();
            this.create61KeyPiano();
            this.setupEventListeners();
            await this.loadProjects();
            this.startGameLoop();
            this.setStatus('Ready', 'ok');
        } catch (error) {
            console.error('Initialization error:', error);
            this.setStatus('Error during startup', 'err');
        }
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Audio context failed:', error);
        }
    }

    async initializeMIDI() {
        try {
            if (navigator.requestMIDIAccess) {
                this.midiAccess = await navigator.requestMIDIAccess();
                this.midiAccess.inputs.forEach(input => {
                    input.onmidimessage = this.handleMIDIMessage.bind(this);
                });
                console.log('MIDI initialized with', this.midiAccess.inputs.size, 'inputs');
                return true;
            } else {
                console.warn('MIDI not supported');
                return false;
            }
        } catch (error) {
            console.warn('MIDI initialization failed:', error);
            return false;
        }
    }

    initializeVexFlow() {
        try {
            const container = document.getElementById('sheetMusic');
            if (!container) {
                console.warn('Sheet music container not found');
                return;
            }
            
            if (!window.VexFlowLoaded || !window.Vex) {
                console.warn('VexFlow not available, using fallback');
                container.innerHTML = '<p>Sheet music display requires VexFlow</p>';
                return;
            }
            
            const VF = Vex.Flow;
            this.vexRenderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
            this.vexRenderer.resize(container.clientWidth || 800, 200);
            
            this.renderEmptyStaff();
            console.log('VexFlow initialized');
        } catch (error) {
            console.warn('VexFlow initialization failed:', error);
        }
    }

    renderEmptyStaff() {
        if (!this.vexRenderer) return;
        
        try {
            const VF = Vex.Flow;
            const context = this.vexRenderer.getContext();
            context.clear();
            
            const stave = new VF.Stave(10, 40, 400);
            stave.addClef('treble').addTimeSignature('4/4');
            stave.setContext(context).draw();
            
            context.fillText('Select a project to see sheet music', 450, 100);
        } catch (error) {
            console.warn('Could not render staff:', error);
        }
    }

    create61KeyPiano() {
        const container = document.getElementById('virtualPiano');
        if (!container) return;
        
        container.innerHTML = '';
        
        const keyboard = document.createElement('div');
        keyboard.className = 'piano-keyboard';
        
        const startNote = 36; // C2
        const numKeys = 61;
        
        const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11];
        const blackKeyPattern = [1, 3, 6, 8, 10];
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        let whiteKeyIndex = 0;
        for (let i = 0; i < numKeys; i++) {
            const midiNote = startNote + i;
            const noteInOctave = midiNote % 12;
            const octave = Math.floor(midiNote / 12) - 1;
            const noteName = noteNames[noteInOctave];
            
            if (whiteKeyPattern.includes(noteInOctave)) {
                const key = document.createElement('div');
                key.className = 'piano-key white-key';
                key.dataset.note = midiNote;
                key.dataset.noteName = noteName + octave;
                key.textContent = noteName + octave;
                key.style.left = (whiteKeyIndex * 40) + 'px';
                
                key.addEventListener('mousedown', () => this.playPianoKey(midiNote, 100));
                key.addEventListener('mouseup', () => this.stopPianoKey(midiNote));
                key.addEventListener('mouseleave', () => this.stopPianoKey(midiNote));
                
                keyboard.appendChild(key);
                whiteKeyIndex++;
            }
        }
        
        whiteKeyIndex = 0;
        for (let i = 0; i < numKeys; i++) {
            const midiNote = startNote + i;
            const noteInOctave = midiNote % 12;
            const octave = Math.floor(midiNote / 12) - 1;
            const noteName = noteNames[noteInOctave];
            
            if (whiteKeyPattern.includes(noteInOctave)) {
                whiteKeyIndex++;
            }
            
            if (blackKeyPattern.includes(noteInOctave)) {
                const key = document.createElement('div');
                key.className = 'piano-key black-key';
                key.dataset.note = midiNote;
                key.dataset.noteName = noteName + octave;
                key.textContent = noteName + octave;
                key.style.left = ((whiteKeyIndex - 1) * 40 + 28) + 'px';
                
                key.addEventListener('mousedown', () => this.playPianoKey(midiNote, 100));
                key.addEventListener('mouseup', () => this.stopPianoKey(midiNote));
                key.addEventListener('mouseleave', () => this.stopPianoKey(midiNote));
                
                keyboard.appendChild(key);
            }
        }
        
        container.appendChild(keyboard);
        console.log('61-key piano created');
    }

    playPianoKey(midiNote, velocity = 100) {
        const key = document.querySelector('[data-note="' + midiNote + '"]');
        if (key) {
            key.classList.add('pressed');
            this.createNoteHitEffect(key);
            
            if (this.audioContext) {
                this.playTone(this.midiNoteToFrequency(midiNote), velocity / 127);
            }
            
            console.log('Playing note: ' + midiNote + ' (' + key.dataset.noteName + ')');
        }
    }

    stopPianoKey(midiNote) {
        const key = document.querySelector('[data-note="' + midiNote + '"]');
        if (key) {
            key.classList.remove('pressed');
        }
    }

    createNoteHitEffect(keyElement) {
        const effect = document.createElement('div');
        effect.className = 'note-hit-effect';
        
        const rect = keyElement.getBoundingClientRect();
        const container = keyElement.closest('.virtual-piano-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        effect.style.left = (rect.left - containerRect.left + rect.width / 2 - 20) + 'px';
        effect.style.top = (rect.top - containerRect.top + rect.height / 2 - 20) + 'px';
        
        container.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 500);
    }

    midiNoteToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    playTone(frequency, volume = 0.5, duration = 0.5) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    handleMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        const command = status & 0xf0;
        
        if (command === 0x90 && velocity > 0) {
            this.playPianoKey(note, velocity);
            this.checkNoteHit(note);
        } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
            this.stopPianoKey(note);
        }
    }

    setupEventListeners() {
        const elements = {
            playBtn: () => this.togglePlayback(),
            pauseBtn: () => this.pausePlayback(),
            stopBtn: () => this.stopPlayback(),
            newProjectBtn: () => this.createNewProject(),
            importMidiBtn: () => this.importMIDI(),
            metronomeBtn: () => this.toggleMetronome(),
            sustainBtn: () => this.toggleSustain(),
            velocityBtn: () => this.toggleVelocity()
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', elements[id]);
            }
        });

        const tempoSlider = document.getElementById('tempoSlider');
        if (tempoSlider) {
            tempoSlider.addEventListener('input', (e) => {
                this.tempo = parseInt(e.target.value);
                const tempoValue = document.getElementById('tempoValue');
                if (tempoValue) {
                    tempoValue.textContent = this.tempo;
                }
            });
        }

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setStatus('Mode: ' + e.target.dataset.mode, 'ok');
            });
        });

        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }

    handleKeyboardShortcut(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'KeyR':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.rewindToStart();
                }
                break;
            case 'KeyM':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.toggleMetronome();
                }
                break;
        }
    }

    async createNewProject() {
        const name = console.warn('Enter project name:');
        if (!name) return;
        
        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        try {
            if (window.electronAPI) {
                const project = await window.electronAPI.createProject({
                    name: sanitizedName,
                    created: new Date().toISOString(),
                    arrangements: [],
                    settings: {
                        defaultTempo: this.tempo,
                        defaultKey: 'C',
                        difficulty: 'beginner'
                    }
                });
                
                this.setStatus('Project "' + sanitizedName + '" created', 'ok');
                await this.loadProjects();
            } else {
                this.setStatus('Electron API not available', 'err');
            }
        } catch (error) {
            this.setStatus('Error creating project: ' + error.message, 'err');
        }
    }

    async loadProjects() {
        try {
            if (!window.electronAPI) {
                this.setStatus('Demo mode - no projects', 'warn');
                return;
            }

            const projects = await window.electronAPI.getProjects();
            const projectsList = document.getElementById('projectsList');
            
            if (!projectsList) return;
            
            if (projects.length === 0) {
                projectsList.innerHTML = '<div class="empty-state">No projects found</div>';
            } else {
                projectsList.innerHTML = projects.map(p => 
                    '<div class="project-item" data-id="' + p.id + '">' +
                        '<strong>' + p.name + '</strong>' +
                        '<div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">' +
                            new Date(p.created).toLocaleDateString() +
                        '</div>' +
                    '</div>'
                ).join('');
                
                projectsList.querySelectorAll('.project-item').forEach(item => {
                    item.addEventListener('click', () => this.loadProject(item.dataset.id));
                });
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.setStatus('Failed to load projects', 'err');
        }
    }

    async loadProject(projectId) {
        try {
            const project = await window.electronAPI.loadProject(projectId);
            this.currentProject = project;
            this.setStatus('Project "' + project.name + '" loaded', 'ok');
            
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === projectId);
            });
            
            this.updateSongInfo(project);
            this.loadProjectMusic(project);
        } catch (error) {
            this.setStatus('Failed to load project', 'err');
        }
    }

    updateSongInfo(project) {
        const songInfo = document.getElementById('songInfo');
        if (!songInfo) return;
        
        songInfo.innerHTML = 
            '<h4>' + project.name + '</h4>' +
            '<p><strong>Created:</strong> ' + new Date(project.created).toLocaleDateString() + '</p>' +
            '<p><strong>Arrangements:</strong> ' + (project.arrangements ? project.arrangements.length : 0) + '</p>' +
            '<p><strong>Tempo:</strong> ' + (project.settings ? project.settings.defaultTempo || this.tempo : this.tempo) + ' BPM</p>' +
            '<p><strong>Key:</strong> ' + (project.settings ? project.settings.defaultKey || 'C' : 'C') + '</p>' +
            '<p><strong>Difficulty:</strong> ' + (project.settings ? project.settings.difficulty || 'beginner' : 'beginner') + '</p>';
    }

    loadProjectMusic(project) {
        this.fallingNotes = [];
        if (project.arrangements && project.arrangements.length > 0) {
            this.generateNotesFromProject(project);
        } else {
            this.generateSampleNotes();
        }
        
        this.renderSheetMusic(project);
    }

    generateSampleNotes() {
        const notes = [60, 62, 64, 65, 67, 69, 71, 72];
        const startTime = Date.now() + 2000;
        
        notes.forEach((note, index) => {
            this.fallingNotes.push({
                midiNote: note,
                startTime: startTime + (index * 1000),
                duration: 500,
                hit: false,
                y: -50,
                x: this.getXForNote(note)
            });
        });
    }

    generateNotesFromProject(project) {
        // Placeholder for actual project note generation
        this.generateSampleNotes();
    }

    getXForNote(midiNote) {
        const startNote = 36;
        const relativeNote = midiNote - startNote;
        return 50 + (relativeNote * 6);
    }

    renderSheetMusic(project) {
        if (!this.vexRenderer) return;
        
        try {
            const VF = Vex.Flow;
            const context = this.vexRenderer.getContext();
            context.clear();
            
            const stave = new VF.Stave(10, 40, 600);
            stave.addClef('treble').addTimeSignature('4/4').addKeySignature('C');
            stave.setContext(context).draw();
            
            context.fillText(project.name || 'Untitled Project', 10, 25);
            
            const notes = [
                new VF.StaveNote({clef: 'treble', keys: ['c/4'], duration: 'q'}),
                new VF.StaveNote({clef: 'treble', keys: ['d/4'], duration: 'q'}),
                new VF.StaveNote({clef: 'treble', keys: ['e/4'], duration: 'q'}),
                new VF.StaveNote({clef: 'treble', keys: ['f/4'], duration: 'q'})
            ];
            
            const voice = new VF.Voice({num_beats: 4, beat_value: 4});
            voice.addTickables(notes);
            
            const formatter = new VF.Formatter().joinVoices([voice]).format([voice], 500);
            voice.draw(context, stave);
            
        } catch (error) {
            console.warn('Sheet music rendering failed:', error);
        }
    }

    startGameLoop() {
        this.gameLoop();
    }

    gameLoop() {
        this.updateFallingNotes();
        this.renderFallingNotes();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateFallingNotes() {
        if (!this.isPlaying) return;
        
        const currentTime = Date.now();
        
        this.fallingNotes.forEach(note => {
            if (currentTime >= note.startTime && !note.hit) {
                note.y += 2;
                
                if (note.y >= 250 && !note.missed) {
                    note.missed = true;
                    this.handleNoteMiss(note);
                }
            }
        });
        
        this.fallingNotes = this.fallingNotes.filter(note => note.y < 400);
    }

    renderFallingNotes() {
        const canvas = document.getElementById('fallingNotesCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.fallingNotes.forEach(note => {
            if (note.y > -50) {
                ctx.fillStyle = note.hit ? '#10b981' : note.missed ? '#ef4444' : '#6366f1';
                ctx.fillRect(note.x, note.y, 30, 10);
                ctx.fillStyle = 'white';
                ctx.font = '10px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(this.midiNoteToName(note.midiNote), note.x + 15, note.y + 8);
            }
        });
    }

    midiNoteToName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        return noteNames[midiNote % 12] + octave;
    }

    checkNoteHit(midiNote) {
        const hitWindow = 50;
        
        for (let note of this.fallingNotes) {
            if (note.midiNote === midiNote && !note.hit && Math.abs(note.y - 250) < hitWindow) {
                note.hit = true;
                this.handleNoteHit(note);
                return;
            }
        }
    }

    handleNoteHit(note) {
        this.hitNotes++;
        this.score += 100;
        this.updateScoreDisplay();
        console.log('Note hit!', note.midiNote);
    }

    handleNoteMiss(note) {
        console.log('Note missed!', note.midiNote);
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        this.totalNotes = this.hitNotes + this.fallingNotes.filter(n => n.missed).length;
        this.accuracy = this.totalNotes > 0 ? Math.round((this.hitNotes / this.totalNotes) * 100) : 0;
        
        const scoreValue = document.getElementById('scoreValue');
        const accuracyValue = document.getElementById('accuracyValue');
        
        if (scoreValue) scoreValue.textContent = this.score;
        if (accuracyValue) accuracyValue.textContent = this.accuracy + '%';
    }

    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        }
        this.setStatus(this.isPlaying ? 'Playing' : 'Paused', this.isPlaying ? 'ok' : 'warn');
        
        if (this.isPlaying && this.fallingNotes.length === 0) {
            this.generateSampleNotes();
        }
    }

    pausePlayback() {
        this.isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.innerHTML = '▶️';
        this.setStatus('Paused', 'warn');
    }

    stopPlayback() {
        this.isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.innerHTML = '▶️';
        this.fallingNotes = [];
        this.setStatus('Stopped', 'warn');
    }

    rewindToStart() {
        this.fallingNotes = [];
        this.score = 0;
        this.hitNotes = 0;
        this.updateScoreDisplay();
        this.setStatus('Rewound to start', 'ok');
    }

    toggleMetronome() {
        this.metronomeEnabled = !this.metronomeEnabled;
        const btn = document.getElementById('metronomeBtn');
        if (btn) btn.classList.toggle('active', this.metronomeEnabled);
        this.setStatus('Metronome ' + (this.metronomeEnabled ? 'ON' : 'OFF'), 'ok');
    }

    toggleSustain() {
        this.sustainEnabled = !this.sustainEnabled;
        const btn = document.getElementById('sustainBtn');
        if (btn) btn.classList.toggle('active', this.sustainEnabled);
        this.setStatus('Sustain ' + (this.sustainEnabled ? 'ON' : 'OFF'), 'ok');
    }

    toggleVelocity() {
        this.velocityEnabled = !this.velocityEnabled;
        const btn = document.getElementById('velocityBtn');
        if (btn) btn.classList.toggle('active', this.velocityEnabled);
        this.setStatus('Velocity ' + (this.velocityEnabled ? 'ON' : 'OFF'), 'ok');
    }

    async importMIDI() {
        try {
            if (!window.electronAPI) {
                this.setStatus('MIDI import requires desktop app', 'warn');
                return;
            }

            const result = await window.electronAPI.showOpenDialog({
                filters: [
                    { name: 'MIDI Files', extensions: ['mid', 'midi'] }
                ]
            });
            
            if (result.canceled) return;
            
            const filePath = result.filePaths[0];
            this.setStatus('MIDI import coming soon!', 'warn');
        } catch (error) {
            this.setStatus('MIDI import failed', 'err');
        }
    }

    setStatus(text, type) {
        try {
            const el = document.getElementById('midiStatus');
            if (!el) return;
            
            const dot = el.querySelector('.status-dot');
            const textEl = el.querySelector('.status-text');
            
            if (textEl) textEl.textContent = String(text || '');
            if (dot) {
                dot.classList.remove('ok', 'warn', 'err');
                if (type) dot.classList.add(type);
            }
        } catch (e) {
            console.warn('setStatus failed:', e);
        }
    }
}

// Initialize app when DOM is ready
let iotaApp;
document.addEventListener('DOMContentLoaded', () => {
    iotaApp = new IotaKeysApp();
});

// Global access for debugging
window.IotaKeysApp = IotaKeysApp;
