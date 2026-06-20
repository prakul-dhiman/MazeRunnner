/**
 * MazeBreaker: Shadow Protocol — Audio Manager
 * Procedurally generated game audio using the Web Audio API.
 * Every sound is synthesised at runtime — zero external files.
 */

import { gameEvents } from '../utils/EventBus.js';

export default class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;

        /** @type {GainNode|null} */
        this.masterGain = null;

        /** @type {GainNode|null} */
        this.musicGain = null;

        /** @type {GainNode|null} */
        this.sfxGain = null;

        /** @type {AudioBuffer|null} Pre-generated white noise buffer */
        this._noiseBuffer = null;

        /** @type {OscillatorNode|null} Ambient drone oscillator */
        this._ambientOsc = null;

        /** @type {GainNode|null} Ambient drone gain */
        this._ambientGain = null;

        /** @type {boolean} */
        this._initialised = false;
    }

    // ─── Initialisation ─────────────────────────────────────────

    /**
     * Create the AudioContext lazily (must be called after a user gesture).
     * Sets up the gain-node routing: sfx → master, music → master, master → destination.
     */
    init() {
        if (this._initialised) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            console.warn('[AudioManager] Web Audio API not available');
            return;
        }

        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.masterGain.gain.value = 0.7;
        this.musicGain.gain.value = 0.5;
        this.sfxGain.gain.value = 0.8;

        this._noiseBuffer = this._createNoiseBuffer();
        this._initialised = true;
    }

    /** Resume AudioContext after a user gesture. */
    resume() {
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ─── Volume Controls ────────────────────────────────────────

    /** @param {number} v 0-1 */
    setMasterVolume(v) {
        if (this.masterGain) this.masterGain.gain.value = v;
    }

    /** @param {number} v 0-1 */
    setMusicVolume(v) {
        if (this.musicGain) this.musicGain.gain.value = v;
    }

    /** @param {number} v 0-1 */
    setSfxVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }

    // ─── Procedural Sounds ──────────────────────────────────────

    /** Short noise burst — footstep with slight pitch variation. */
    playFootstep() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;
        const src = this._noiseSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.value = 800 + Math.random() * 400;
        filter.Q.value = 1.2;

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        src.connect(filter).connect(gain).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.05);
    }

    /** Ascending sine sweep 400→800 Hz — coin pickup. */
    playCoinPickup() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain).connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    /** Two-note chime — relic pickup. */
    playRelicPickup() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        this._playSine(600, 0.3, 0.18, 'sine', t);
        this._playSine(800, 0.3, 0.18, 'sine', t + 0.1);
    }

    /** Sharp sawtooth stab — enemy alert. */
    playEnemyAlert() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        this._playSine(200, 0.1, 0.25, 'sawtooth', t);
    }

    /** Low frequency hit + noise — damage impact. */
    playDamage() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        // Low sine thump
        this._playSine(80, 0.2, 0.3, 'sine', t);

        // Noise crunch
        const src = this._noiseSource();
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        src.connect(gain).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.2);
    }

    /**
     * Filtered noise burst + sine tone — ability activation.
     * @param {string} [abilityId]
     */
    playAbility(abilityId) {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        // Frequency varies by ability
        const freqMap = {
            timeFreeze: 500,
            decoy: 350,
            emp: 700,
            teleport: 900,
            cloak: 450,
        };
        const freq = freqMap[abilityId] ?? 600;

        this._playSine(freq, 0.25, 0.2, 'sine', t);

        // Noise burst
        const src = this._noiseSource();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(filter).connect(gain).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.15);
    }

    /** Major chord arpeggio — victory. */
    playVictory() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        // C4 - E4 - G4 ascending
        this._playSine(261.63, 0.4, 0.18, 'sine', t);
        this._playSine(329.63, 0.4, 0.18, 'sine', t + 0.15);
        this._playSine(392.00, 0.5, 0.22, 'sine', t + 0.30);
    }

    /** Descending minor tones — defeat. */
    playDefeat() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;

        // A3 - F3 - D3 descending
        this._playSine(220.00, 0.4, 0.18, 'sine', t);
        this._playSine(174.61, 0.4, 0.18, 'sine', t + 0.20);
        this._playSine(146.83, 0.5, 0.22, 'sine', t + 0.40);
    }

    /** Rising tension drone — detection. */
    playDetection() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.5);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain).connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.6);
    }

    /** Very short click — button press. */
    playButtonClick() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;
        const src = this._noiseSource();
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
        src.connect(gain).connect(this.sfxGain);
        src.start(t);
        src.stop(t + 0.005);
    }

    /** Subtle soft tone — button hover. */
    playButtonHover() {
        if (!this._ensureCtx()) return;
        const t = this.ctx.currentTime;
        this._playSine(1000, 0.03, 0.04, 'sine', t);
    }

    // ─── Ambient ────────────────────────────────────────────────

    /** Start a looping ambient drone — low oscillator with filter modulation. */
    startAmbient() {
        if (!this._ensureCtx() || this._ambientOsc) return;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 55;

        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 5;

        // LFO modulates the filter for an eerie pulse
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 120;
        lfo.connect(lfoGain).connect(filter.frequency);

        gain.gain.value = 0.08;

        osc.connect(filter).connect(gain).connect(this.musicGain);

        osc.start();
        lfo.start();

        this._ambientOsc = osc;
        this._ambientLfo = lfo;
        this._ambientGain = gain;
    }

    /** Stop the ambient drone. */
    stopAmbient() {
        if (this._ambientOsc) {
            this._ambientOsc.stop();
            this._ambientOsc = null;
        }
        if (this._ambientLfo) {
            this._ambientLfo.stop();
            this._ambientLfo = null;
        }
        this._ambientGain = null;
    }

    // ─── Internal Utilities ─────────────────────────────────────

    /**
     * Generate a white noise AudioBuffer for reuse.
     * @private
     * @returns {AudioBuffer}
     */
    _createNoiseBuffer() {
        const length = this.ctx.sampleRate * 0.5; // 500ms
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Create a BufferSource from the pre-generated noise buffer.
     * @private
     * @returns {AudioBufferSourceNode}
     */
    _noiseSource() {
        const src = this.ctx.createBufferSource();
        src.buffer = this._noiseBuffer;
        return src;
    }

    /**
     * Play a simple tone.
     * @private
     * @param {number} freq - Frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {number} volume - Peak volume 0-1
     * @param {string} type - Oscillator type
     * @param {number} [startTime] - AudioContext time
     */
    _playSine(freq, duration, volume, type = 'sine', startTime) {
        const t = startTime ?? this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain).connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    /**
     * Ensure the AudioContext is ready.
     * @private
     * @returns {boolean}
     */
    _ensureCtx() {
        if (!this._initialised) this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        return !!this.ctx;
    }
}
