// Train sound effects using Web Audio API - Realistic synthesis
class TrainSounds {
    constructor() {
        this.audioContext = null;
        this.bellInterval = null;
        this.trainSources = [];
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {

        }
    }
    
    // Create realistic railroad crossing bell - metallic resonant sound
    playBell() {
        if (!this.audioContext) return;
        
        // Stop any existing bell
        this.stopBell();
        
        // Classic crossing bell pattern: alternating ding-dong
        let bellCount = 0;
        this.bellInterval = setInterval(() => {
            const now = this.audioContext.currentTime;
            
            // Create metallic bell sound with multiple harmonics
            const fundamentalFreq = bellCount % 2 === 0 ? 1200 : 900;
            
            // Multiple oscillators for rich metallic sound
            for (let i = 0; i < 5; i++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                // Harmonic series for bell resonance
                osc.frequency.value = fundamentalFreq * (i + 1);
                osc.type = 'sine';
                
                // Each harmonic fades at different rate
                const volume = 0.2 / (i + 1);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume, now + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + (i * 0.1));
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now);
                osc.stop(now + 0.6);
            }
            
            bellCount++;
        }, 500); // Slower, more realistic rhythm
        
        return this.bellInterval;
    }
    
    stopBell() {
        if (this.bellInterval) {
            clearInterval(this.bellInterval);
            this.bellInterval = null;
        }
    }
    
    // Realistic train passing sound with multiple layers
    playTrainPass() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const duration = 4.0;
        
        // 1. Deep rumble - wheels on tracks (multiple frequencies for realism)
        for (let i = 0; i < 3; i++) {
            const rumble = this.audioContext.createOscillator();
            const rumbleGain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            rumble.frequency.value = 40 + (i * 15); // Layered bass
            rumble.type = 'sawtooth';
            
            filter.type = 'lowpass';
            filter.frequency.value = 150;
            
            rumbleGain.gain.setValueAtTime(0, now);
            rumbleGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
            rumbleGain.gain.linearRampToValueAtTime(0.15, now + duration - 0.8);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            rumble.connect(filter);
            filter.connect(rumbleGain);
            rumbleGain.connect(this.audioContext.destination);
            
            rumble.start(now);
            rumble.stop(now + duration);
            this.trainSources.push(rumble);
        }
        
        // 2. Clacking/rattling - realistic train rhythm (clickety-clack)
        const clackPattern = [0, 0.15, 0.3, 0.45, 0.7, 0.85, 1.0, 1.15, 1.4, 1.55, 1.7, 1.85, 2.1, 2.25, 2.4, 2.55];
        clackPattern.forEach(time => {
            if (now + time < now + duration) {
                const clack = this.audioContext.createOscillator();
                const clackGain = this.audioContext.createGain();
                const clackFilter = this.audioContext.createBiquadFilter();
                
                clack.frequency.value = 800 + Math.random() * 400;
                clack.type = 'square';
                
                clackFilter.type = 'bandpass';
                clackFilter.frequency.value = 1000;
                
                clackGain.gain.setValueAtTime(0.08, now + time);
                clackGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.1);
                
                clack.connect(clackFilter);
                clackFilter.connect(clackGain);
                clackGain.connect(this.audioContext.destination);
                
                clack.start(now + time);
                clack.stop(now + time + 0.1);
            }
        });
        
        // 3. Metal screeching/friction - high frequency noise
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        // Create white noise buffer
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 3000;
        noiseFilter.Q.value = 2;
        
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.03, now + 0.3);
        noiseGain.gain.linearRampToValueAtTime(0.03, now + duration - 0.5);
        noiseGain.gain.linearRampToValueAtTime(0, now + duration);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noise.start(now);
        this.trainSources.push(noise);
        
        // 4. Horn/whistle at start
        const horn = this.audioContext.createOscillator();
        const hornGain = this.audioContext.createGain();
        horn.frequency.value = 220;
        horn.type = 'triangle';
        
        hornGain.gain.setValueAtTime(0, now);
        hornGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        hornGain.gain.linearRampToValueAtTime(0, now + 0.5);
        
        horn.connect(hornGain);
        hornGain.connect(this.audioContext.destination);
        
        horn.start(now);
        horn.stop(now + 0.5);
        this.trainSources.push(horn);
    }
    
    // Clean up
    cleanup() {
        this.stopBell();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export singleton instance
const trainSounds = new TrainSounds();
