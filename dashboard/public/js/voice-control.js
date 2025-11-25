/**
 * Voice Control Module
 * Hands-free control using Web Speech API
 */

const VoiceControl = {
    recognition: null,
    synthesis: null,
    isListening: false,
    language: 'en-US',

    // Initialize voice control
    init() {
        console.log('[INFO] Initializing Voice Control...');

        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('[WARN] Speech Recognition not supported in this browser');
            return;
        }

        this.setupRecognition();
        this.setupSynthesis();
        this.setupEventListeners();

        console.log('[SUCCESS] Voice Control initialized');
    },

    // Setup speech recognition
    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
            console.log('[INFO] Voice recognition started');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            const confidence = event.results[0][0].confidence;

            console.log(`[INFO] Recognized: "${transcript}" (confidence: ${confidence})`);
            this.handleCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('[ERROR] Speech recognition error:', event.error);
            this.isListening = false;
            this.updateUI('error');

            if (event.error === 'no-speech') {
                this.speak('I didn\'t hear anything. Please try again.');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('idle');
            console.log('[INFO] Voice recognition ended');
        };
    },

    // Setup speech synthesis
    setupSynthesis() {
        this.synthesis = window.speechSynthesis;
    },

    // Setup event listeners
    setupEventListeners() {
        // Voice button in header
        const voiceBtn = document.getElementById('voice-control-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleListening());
        }

        // Keyboard shortcut (Ctrl+Space or Cmd+Space)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    },

    // Toggle listening
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },

    // Start listening
    startListening() {
        if (!this.recognition) {
            console.error('[ERROR] Speech recognition not available');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('[ERROR] Failed to start recognition:', error);
        }
    },

    // Stop listening
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    // Handle voice command
    handleCommand(transcript) {
        console.log(`[INFO] Processing command: "${transcript}"`);

        // Show transcript
        this.showTranscript(transcript);

        // Water/Irrigation commands
        if (transcript.includes('water') || transcript.includes('irrigate') || transcript.includes('irrigation')) {
            this.handleIrrigationCommand(transcript);
            return;
        }

        // Soil moisture query
        if (transcript.includes('soil moisture') || transcript.includes('moisture level')) {
            this.handleSoilMoistureQuery();
            return;
        }

        // Weather query
        if (transcript.includes('weather') || transcript.includes('forecast')) {
            this.handleWeatherQuery();
            return;
        }

        // Pump control
        if (transcript.includes('pump')) {
            this.handlePumpCommand(transcript);
            return;
        }

        // Navigation
        if (transcript.includes('show') || transcript.includes('open') || transcript.includes('go to')) {
            this.handleNavigationCommand(transcript);
            return;
        }

        // Alerts
        if (transcript.includes('alert') || transcript.includes('notification')) {
            this.handleAlertsQuery();
            return;
        }

        // Map
        if (transcript.includes('map')) {
            this.handleMapCommand(transcript);
            return;
        }

        // Temperature
        if (transcript.includes('temperature') || transcript.includes('temp')) {
            this.handleTemperatureQuery();
            return;
        }

        // Default: command not recognized
        this.speak('Sorry, I didn\'t understand that command. Try saying "water zone 2" or "show weather"');
    },

    // Handle irrigation commands
    handleIrrigationCommand(transcript) {
        // Extract zone number
        const zoneMatch = transcript.match(/zone\s*(\d+)/i);
        const zone = zoneMatch ? zoneMatch[1] : 'all';

        // Extract duration
        const durationMatch = transcript.match(/(\d+)\s*(minute|min)/i);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 15;

        // Execute irrigation
        if (typeof FarmControls !== 'undefined') {
            this.speak(`Starting irrigation for zone ${zone}, ${duration} minutes`);

            setTimeout(() => {
                FarmControls.startIrrigation(zone, duration);
            }, 1000);
        } else {
            this.speak('Irrigation system not available');
        }
    },

    // Handle soil moisture query
    async handleSoilMoistureQuery() {
        if (typeof Dashboard !== 'undefined') {
            const sensors = await Dashboard.fetchSensorData();
            if (sensors && sensors.length > 0) {
                const moisture = sensors[0].soil_moisture || 60;
                this.speak(`Current soil moisture is ${Math.round(moisture)} percent`);
            } else {
                this.speak('Soil moisture data not available');
            }
        } else {
            this.speak('Sensor data not available');
        }
    },

    // Handle weather query
    handleWeatherQuery() {
        if (typeof Weather !== 'undefined' && Weather.forecastData && Weather.forecastData.length > 0) {
            const today = Weather.forecastData[0];
            const temp = today.temp || 28;
            const condition = today.condition || 'partly cloudy';

            this.speak(`Today's weather: ${Math.round(temp)} degrees, ${condition}`);
        } else {
            this.speak('Weather data not available');
        }
    },

    // Handle pump commands
    handlePumpCommand(transcript) {
        if (transcript.includes('on') || transcript.includes('start') || transcript.includes('turn on')) {
            this.speak('Turning pump on');
            if (typeof FarmControls !== 'undefined') {
                setTimeout(() => FarmControls.activatePump(), 1000);
            }
        } else if (transcript.includes('off') || transcript.includes('stop') || transcript.includes('turn off')) {
            this.speak('Turning pump off');
            if (typeof FarmControls !== 'undefined') {
                setTimeout(() => FarmControls.deactivatePump(), 1000);
            }
        } else if (transcript.includes('status')) {
            const status = document.getElementById('pump-status-indicator')?.textContent || 'unknown';
            this.speak(`Pump is currently ${status}`);
        }
    },

    // Handle navigation commands
    handleNavigationCommand(transcript) {
        const views = {
            'overview': ['overview', 'home', 'dashboard'],
            'map': ['map', 'farm map'],
            'sensors': ['sensors', 'sensor data', 'live sensors'],
            'charts': ['charts', 'analytics', 'graphs'],
            'weather': ['weather', 'forecast'],
            'intelligence': ['intelligence', 'ai', 'insights'],
            'controls': ['controls', 'farm controls', 'irrigation'],
            'alerts': ['alerts', 'notifications'],
            'satellite': ['satellite', 'satellite data'],
            'reports': ['reports', 'readings']
        };

        for (const [view, keywords] of Object.entries(views)) {
            if (keywords.some(keyword => transcript.includes(keyword))) {
                this.speak(`Opening ${view}`);
                if (typeof Navigation !== 'undefined') {
                    setTimeout(() => Navigation.navigateTo(view), 1000);
                }
                return;
            }
        }

        this.speak('I couldn\'t find that section');
    },

    // Handle alerts query
    handleAlertsQuery() {
        const alertsCount = document.getElementById('alerts-count')?.textContent || '0';
        const count = parseInt(alertsCount);

        if (count === 0) {
            this.speak('You have no active alerts');
        } else if (count === 1) {
            this.speak('You have 1 active alert');
        } else {
            this.speak(`You have ${count} active alerts`);
        }
    },

    // Handle map commands
    handleMapCommand(transcript) {
        if (transcript.includes('show') || transcript.includes('open')) {
            this.speak('Opening map');
            if (typeof FarmMap !== 'undefined') {
                setTimeout(() => FarmMap.toggleMap(), 1000);
            }
        } else if (transcript.includes('hide') || transcript.includes('close')) {
            this.speak('Closing map');
            if (typeof FarmMap !== 'undefined') {
                setTimeout(() => FarmMap.toggleMap(), 1000);
            }
        }
    },

    // Handle temperature query
    async handleTemperatureQuery() {
        if (typeof Dashboard !== 'undefined') {
            const sensors = await Dashboard.fetchSensorData();
            if (sensors && sensors.length > 0) {
                const temp = sensors[0].temperature || 28;
                this.speak(`Current temperature is ${Math.round(temp)} degrees celsius`);
            } else {
                this.speak('Temperature data not available');
            }
        } else {
            this.speak('Sensor data not available');
        }
    },

    // Text-to-speech
    speak(text) {
        if (!this.synthesis) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        this.synthesis.speak(utterance);

        // Show as notification
        if (typeof Notifications !== 'undefined') {
            Notifications.show('🎤 Voice Assistant', text, 'info', 4000);
        }
    },

    // Show transcript
    showTranscript(text) {
        const transcriptEl = document.getElementById('voice-transcript');
        if (transcriptEl) {
            transcriptEl.textContent = `"${text}"`;
            transcriptEl.classList.remove('hidden');

            setTimeout(() => {
                transcriptEl.classList.add('hidden');
            }, 5000);
        }
    },

    // Update UI state
    updateUI(state) {
        const btn = document.getElementById('voice-control-btn');
        const icon = document.getElementById('voice-icon');

        if (!btn) return;

        switch (state) {
            case 'listening':
                btn.classList.add('listening');
                btn.classList.remove('error');
                if (icon) icon.setAttribute('data-lucide', 'mic');
                break;

            case 'error':
                btn.classList.remove('listening');
                btn.classList.add('error');
                setTimeout(() => btn.classList.remove('error'), 2000);
                break;

            case 'idle':
            default:
                btn.classList.remove('listening', 'error');
                if (icon) icon.setAttribute('data-lucide', 'mic-off');
                break;
        }

        // Refresh Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Change language
    setLanguage(lang) {
        const langMap = {
            'en': 'en-US',
            'fr': 'fr-FR'
        };

        this.language = langMap[lang] || 'en-US';

        if (this.recognition) {
            this.recognition.lang = this.language;
        }
    },

    // Get available commands
    getCommands() {
        return [
            'Water zone 1 for 10 minutes',
            'What is the soil moisture?',
            'Show weather forecast',
            'Turn pump on',
            'Turn pump off',
            'Show map',
            'How many alerts?',
            'What is the temperature?',
            'Go to analytics',
            'Open farm controls'
        ];
    }
};
