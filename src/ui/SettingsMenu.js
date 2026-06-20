/**
 * MazeBreaker: Shadow Protocol — Settings Menu
 * Volume controls with persistence via localStorage.
 */

import { gameEvents } from '../utils/EventBus.js';

const SETTINGS_KEY = 'mazebreaker_settings';

/** Default settings values */
const DEFAULTS = {
    master: 0.7,
    music: 0.5,
    sfx: 0.8,
};

export default class SettingsMenu {
    /**
     * @param {object|null} audioManager - Reference to the AudioManager
     */
    constructor(audioManager) {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('settings-menu');

        /** @type {object|null} */
        this.audioManager = audioManager;

        /** @type {{ master: number, music: number, sfx: number }} */
        this.settings = { ...DEFAULTS };

        /** Slider element cache */
        this._sliders = {
            master: document.getElementById('vol-master'),
            music: document.getElementById('vol-music'),
            sfx: document.getElementById('vol-sfx'),
        };

        /** Value display cache */
        this._values = {
            master: document.getElementById('vol-master-val'),
            music: document.getElementById('vol-music-val'),
            sfx: document.getElementById('vol-sfx-val'),
        };
    }

    // ─── Initialisation ─────────────────────────────────────────

    /** Bind slider events and load persisted settings. */
    init() {
        this.loadSettings();

        Object.keys(this._sliders).forEach(type => {
            const slider = this._sliders[type];
            if (!slider) return;

            slider.addEventListener('input', () => {
                const value = parseInt(slider.value, 10) / 100;
                this.onVolumeChange(type, value);
            });
        });
    }

    // ─── Screen Lifecycle ───────────────────────────────────────

    /** Display the settings screen and sync sliders to current values. */
    show() {
        if (this.el) this.el.classList.add('active');

        // Sync slider positions
        Object.keys(this._sliders).forEach(type => {
            const slider = this._sliders[type];
            const valueEl = this._values[type];
            if (slider) {
                slider.value = Math.round(this.settings[type] * 100);
            }
            if (valueEl) {
                valueEl.textContent = `${Math.round(this.settings[type] * 100)}%`;
            }
        });
    }

    /** Hide the settings screen. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }

    // ─── Volume Handling ────────────────────────────────────────

    /**
     * Update volume for a given type and propagate to audio manager.
     * @param {'master'|'music'|'sfx'} type
     * @param {number} value - 0-1
     */
    onVolumeChange(type, value) {
        this.settings[type] = value;

        // Update display
        const valueEl = this._values[type];
        if (valueEl) {
            valueEl.textContent = `${Math.round(value * 100)}%`;
        }

        // Push to audio manager
        if (this.audioManager) {
            switch (type) {
                case 'master': this.audioManager.setMasterVolume(value); break;
                case 'music': this.audioManager.setMusicVolume(value); break;
                case 'sfx': this.audioManager.setSfxVolume(value); break;
            }
        }

        gameEvents.emit('audio:volumeChanged', { type, value });
        this.saveSettings();
    }

    // ─── Persistence ────────────────────────────────────────────

    /** Persist current settings to localStorage. */
    saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch { /* storage full or unavailable */ }
    }

    /** Load settings from localStorage and apply to audio manager. */
    loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.settings = { ...DEFAULTS, ...parsed };
            }
        } catch {
            this.settings = { ...DEFAULTS };
        }

        // Apply to audio manager on load
        if (this.audioManager) {
            this.audioManager.setMasterVolume(this.settings.master);
            this.audioManager.setMusicVolume(this.settings.music);
            this.audioManager.setSfxVolume(this.settings.sfx);
        }
    }
}
