const { ipcRenderer, remote } = require('electron');

class IotaKeysApp {
    constructor() {
        this.currentTab = 'practice';
        this.isPlaying = false;
        this.currentSong = null;
        this.settings = {
            masterVolume: 80,
            showFingerNumbers: false,
            highlightNextNote: true,
            waitForCorrectNote: false,
            midiInputDevice: null
        };
        
        this.practiceEngine = null;
        this.progressTracker = null;
        this.piano = null;
        this.midiHandler = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        this.showLoadingScreen();
        
        try {
            await this.loadDependencies();
            this.initializeComponents();
            this.setupEventListeners();
            this.setupTitleBarControls();
            this.initializeParticles();
            await this.loadUserSettings();
            await this.loadProgress();
            
            this.hideLoadingScreen();
            this.showToast('IotaKeys ready to rock! 🎹', 'success');
       } catch (error) {
           console.error('Failed to initialize app:', error);
           this.showToast('Failed to initialize IotaKeys. Please restart the app.', 'error');
       }
   }

   showLoadingScreen() {
       const loadingHTML = `
           <div class="loading-screen" id="loading-screen">
               <div class="loading-spinner"></div>
               <div class="loading-text">Loading IotaKeys...</div>
           </div>
       `;
       document.body.insertAdjacentHTML('afterbegin', loadingHTML);
   }

   hideLoadingScreen() {
       const loadingScreen = document.getElementById('loading-screen');
       if (loadingScreen) {
           loadingScreen.style.opacity = '0';
           setTimeout(() => loadingScreen.remove(), 500);
       }
   }

   async loadDependencies() {
       // Load external libraries
       await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/tone.js/14.8.49/Tone.min.js');
       await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/particles.js/2.0.0/particles.min.js');
       await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/chart.js/3.9.1/chart.min.js');
       await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js');
   }

   loadScript(src) {
       return new Promise((resolve, reject) => {
           const script = document.createElement('script');
           script.src = src;
           script.onload = resolve;
           script.onerror = reject;
           document.head.appendChild(script);
       });
   }

   initializeComponents() {
       this.piano = new PianoComponent();
       this.midiHandler = new MIDIHandler();
       this.practiceEngine = new PracticeEngine(this.piano, this.midiHandler);
       this.progressTracker = new ProgressTracker();
       
       // Initialize UI components
       this.initializeTabs();
       this.initializeControls();
   }

   initializeTabs() {
       const navItems = document.querySelectorAll('.nav-item');
       navItems.forEach(item => {
           item.addEventListener('click', (e) => {
               const tab = e.currentTarget.dataset.tab;
               this.switchTab(tab);
           });
       });
   }

   switchTab(tabName) {
       // Update nav items
       document.querySelectorAll('.nav-item').forEach(item => {
           item.classList.remove('active');
       });
       document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
       
       // Update tab content
       document.querySelectorAll('.tab-content').forEach(content => {
           content.style.display = 'none';
       });
       document.getElementById(`${tabName}-tab`).style.display = 'block';
       
       this.currentTab = tabName;
       this.onTabChanged(tabName);
   }

   onTabChanged(tabName) {
       switch (tabName) {
           case 'progress':
               this.updateProgressTab();
               break;
           case 'library':
               this.updateLibraryTab();
               break;
           case 'settings':
               this.updateSettingsTab();
               break;
       }
   }

   initializeControls() {
       // Load MIDI file
       document.getElementById('load-midi').addEventListener('click', async () => {
           await this.loadMIDIFile();
       });

       // Play/Pause
       document.getElementById('play-pause').addEventListener('click', () => {
           this.togglePlayback();
       });

       // Stop
       document.getElementById('stop').addEventListener('click', () => {
           this.stopPlayback();
       });

       // Metronome
       document.getElementById('metronome').addEventListener('click', () => {
           this.toggleMetronome();
       });

       // Tempo slider
       const tempoSlider = document.getElementById('tempo-slider');
       tempoSlider.addEventListener('input', (e) => {
           this.updateTempo(parseInt(e.target.value));
       });
   }

   setupEventListeners() {
       // IPC events
       ipcRenderer.on('open-file', () => this.loadMIDIFile());
       ipcRenderer.on('toggle-practice', () => this.togglePlayback());
       ipcRenderer.on('reset-song', () => this.resetSong());
       ipcRenderer.on('toggle-metronome', () => this.toggleMetronome());
       
       // Keyboard shortcuts
       document.addEventListener('keydown', (e) => {
           this.handleKeyboardShortcuts(e);
       });

       // Window resize
       window.addEventListener('resize', () => {
           this.handleWindowResize();
       });
   }

   setupTitleBarControls() {
       const currentWindow = remote.getCurrentWindow();
       
       document.getElementById('minimize-btn').addEventListener('click', () => {
           currentWindow.minimize();
       });
       
       document.getElementById('maximize-btn').addEventListener('click', () => {
           if (currentWindow.isMaximized()) {
               currentWindow.unmaximize();
           } else {
               currentWindow.maximize();
           }
       });
       
       document.getElementById('close-btn').addEventListener('click', () => {
           currentWindow.close();
       });
   }

   initializeParticles() {
       particlesJS('particles-js', {
           particles: {
               number: { value: 50, density: { enable: true, value_area: 800 } },
               color: { value: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'] },
               shape: { type: 'circle' },
               opacity: { value: 0.3, random: true },
               size: { value: 3, random: true },
               line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.1, width: 1 },
               move: { enable: true, speed: 1, direction: 'none', out_mode: 'out' }
           },
           interactivity: {
               detect_on: 'canvas',
               events: {
                   onhover: { enable: true, mode: 'repulse' },
                   onclick: { enable: true, mode: 'push' }
               }
           },
           retina_detect: true
       });
   }

   async loadMIDIFile() {
       try {
           const filePath = await ipcRenderer.invoke('select-midi-file');
           if (filePath) {
               await this.practiceEngine.loadMIDI(filePath);
               this.updateSongInfo();
               this.enableControls();
               this.showToast('MIDI file loaded successfully!', 'success');
           }
       } catch (error) {
           console.error('Failed to load MIDI file:', error);
           this.showToast('Failed to load MIDI file. Please try again.', 'error');
       }
   }

   updateSongInfo() {
       const songData = this.practiceEngine.getCurrentSong();
       if (songData) {
           document.getElementById('song-title').textContent = songData.name || 'Unknown Song';
           document.getElementById('total-time').textContent = this.formatTime(songData.duration);
       }
   }

   enableControls() {
       document.getElementById('play-pause').disabled = false;
       document.getElementById('stop').disabled = false;
   }

   togglePlayback() {
       if (this.isPlaying) {
           this.practiceEngine.pause();
           this.updatePlayButton('play');
       } else {
           this.practiceEngine.play();
           this.updatePlayButton('pause');
       }
       this.isPlaying = !this.isPlaying;
   }

   stopPlayback() {
       this.practiceEngine.stop();
       this.updatePlayButton('play');
       this.isPlaying = false;
       this.resetProgress();
   }

   resetSong() {
       this.practiceEngine.reset();
       this.resetProgress();
       this.showToast('Song reset to beginning', 'info');
   }

   updatePlayButton(state) {
       const button = document.getElementById('play-pause');
       const icon = button.querySelector('i');
       if (state === 'play') {
           icon.className = 'fas fa-play';
       } else {
           icon.className = 'fas fa-pause';
       }
   }

   toggleMetronome() {
       const isActive = this.practiceEngine.toggleMetronome();
       const button = document.getElementById('metronome');
       if (isActive) {
           button.classList.add('active');
           this.showMetronomeVisual();
       } else {
           button.classList.remove('active');
           this.hideMetronomeVisual();
       }
   }

   updateTempo(tempo) {
       document.getElementById('tempo-value').textContent = tempo;
       this.practiceEngine.setTempo(tempo);
   }

   handleKeyboardShortcuts(e) {
       if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
       
       switch (e.code) {
           case 'Space':
               e.preventDefault();
               this.togglePlayback();
               break;
           case 'KeyR':
               e.preventDefault();
               this.resetSong();
               break;
           case 'KeyM':
               e.preventDefault();
               this.toggleMetronome();
               break;
       }
   }

   handleWindowResize() {
       if (this.piano) {
           this.piano.handleResize();
       }
   }

   showToast(message, type = 'info') {
       const toastContainer = this.getOrCreateToastContainer();
       const toast = document.createElement('div');
       toast.className = `toast ${type}`;
       toast.textContent = message;
       
       toastContainer.appendChild(toast);
       
       setTimeout(() => {
           toast.classList.add('removing');
           setTimeout(() => {
               if (toast.parentNode) {
                   toast.parentNode.removeChild(toast);
               }
           }, 300);
       }, 3000);
   }

   getOrCreateToastContainer() {
       let container = document.getElementById('toast-container');
       if (!container) {
           container = document.createElement('div');
           container.id = 'toast-container';
           container.className = 'toast-container';
           document.body.appendChild(container);
       }
       return container;
   }

   showMetronomeVisual() {
       if (!document.getElementById('metronome-visual')) {
           const visual = document.createElement('div');
           visual.id = 'metronome-visual';
           visual.className = 'metronome-visual';
           document.body.appendChild(visual);
       }
   }

   hideMetronomeVisual() {
       const visual = document.getElementById('metronome-visual');
       if (visual) {
           visual.remove();
       }
   }

   formatTime(seconds) {
       const minutes = Math.floor(seconds / 60);
       const remainingSeconds = Math.floor(seconds % 60);
       return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
   }

   resetProgress() {
       document.getElementById('current-time').textContent = '0:00';
       document.getElementById('song-progress').style.width = '0%';
   }

   async loadUserSettings() {
       try {
           const savedSettings = await ipcRenderer.invoke('load-progress');
           if (savedSettings.settings) {
               this.settings = { ...this.settings, ...savedSettings.settings };
               this.applySettings();
           }
       } catch (error) {
           console.error('Failed to load settings:', error);
       }
   }

   async saveUserSettings() {
       try {
           const data = await ipcRenderer.invoke('load-progress') || {};
           data.settings = this.settings;
           await ipcRenderer.invoke('save-progress', data);
       } catch (error) {
           console.error('Failed to save settings:', error);
       }
   }

   applySettings() {
       document.getElementById('master-volume').value = this.settings.masterVolume;
       document.getElementById('show-finger-numbers').checked = this.settings.showFingerNumbers;
       document.getElementById('highlight-next-note').checked = this.settings.highlightNextNote;
       document.getElementById('wait-for-correct-note').checked = this.settings.waitForCorrectNote;
   }

   updateProgressTab() {
       // Implementation will be in ProgressTracker component
       this.progressTracker.updateDisplay();
   }

   updateLibraryTab() {
       // Load and display saved songs
       this.loadMusicLibrary();
   }

   updateSettingsTab() {
       this.setupSettingsControls();
   }

   async loadProgress() {
       try {
           const progressData = await ipcRenderer.invoke('load-progress');
           if (progressData) {
               this.progressTracker.loadData(progressData);
           }
       } catch (error) {
           console.error('Failed to load progress:', error);
       }
   }

   setupSettingsControls() {
       // Master Volume
       const volumeSlider = document.getElementById('master-volume');
       volumeSlider.addEventListener('input', (e) => {
           this.settings.masterVolume = parseInt(e.target.value);
           this.saveUserSettings();
       });

       // Checkboxes
       const checkboxes = ['show-finger-numbers', 'highlight-next-note', 'wait-for-correct-note'];
       checkboxes.forEach(id => {
           const checkbox = document.getElementById(id);
           checkbox.addEventListener('change', (e) => {
               const setting = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
               this.settings[setting] = e.target.checked;
               this.applySettingsToComponents();
               this.saveUserSettings();
           });
       });
   }

   applySettingsToComponents() {
       if (this.piano) {
           this.piano.setShowFingers(this.settings.showFingerNumbers);
       }
       if (this.practiceEngine) {
           this.practiceEngine.setHighlightNextNote(this.settings.highlightNextNote);
           this.practiceEngine.setWaitForCorrectNote(this.settings.waitForCorrectNote);
       }
   }

   loadMusicLibrary() {
       // Placeholder for music library functionality
       const songGrid = document.getElementById('song-grid');
       songGrid.innerHTML = '<div class="no-songs">No songs in library. Import MIDI files to get started!</div>';
   }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
   window.iotaKeysApp = new IotaKeysApp();
});