/**
 * MazeBreaker: Shadow Protocol — UI Manager
 * Orchestrates all UI screen transitions, button bindings, and overlay logic.
 */

import { GAME_STATES } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';

export default class UIManager {
    /**
     * @param {object} gameEngine - Reference to the main game engine
     */
    constructor(gameEngine) {
        /** @type {object} */
        this.engine = gameEngine;

        /** @type {NodeListOf<Element>} */
        this.screens = document.querySelectorAll('.ui-screen');

        /** @type {string|null} Track previous screen for back navigation */
        this._previousScreen = null;

        /** @type {string|null} Track currently visible screen */
        this._currentScreen = 'main-menu';
    }

    // ─── Initialisation ─────────────────────────────────────────

    /** Bind every button click and listen for engine state changes. */
    init() {
        this._bindButtons();
        this._setupVolumeSliders();
        this._listenForStateChanges();
    }

    // ─── Button Bindings ────────────────────────────────────────

    /** @private */
    _bindButtons() {
        // Main Menu
        this._on('btn-new-game', () => {
            this.engine.startNewGame();
        });

        this._on('btn-continue', () => {
            this.engine.continueSavedGame();
        });

        this._on('btn-shop', () => {
            this._previousScreen = this._currentScreen;
            this.showScreen('shop-screen');
            gameEvents.emit('ui:screenChanged', { screen: 'shop-screen' });
        });

        this._on('btn-achievements', () => {
            this._previousScreen = this._currentScreen;
            this.showScreen('achievements-screen');
            gameEvents.emit('ui:screenChanged', { screen: 'achievements-screen' });
        });

        this._on('btn-leaderboard', () => {
            this._previousScreen = this._currentScreen;
            this.showScreen('leaderboard-screen');
            gameEvents.emit('ui:screenChanged', { screen: 'leaderboard-screen' });
        });

        this._on('btn-settings', () => {
            this._previousScreen = this._currentScreen;
            this.showScreen('settings-menu');
            gameEvents.emit('ui:screenChanged', { screen: 'settings-menu' });
        });

        // Pause Menu
        this._on('btn-resume', () => {
            this.engine.setState(GAME_STATES.PLAYING);
        });

        this._on('btn-pause-settings', () => {
            this._previousScreen = 'pause-menu';
            this.showOverlay('settings-menu');
            gameEvents.emit('ui:screenChanged', { screen: 'settings-menu' });
        });

        this._on('btn-quit', () => {
            this.engine.setState(GAME_STATES.MENU);
        });

        // Settings
        this._on('btn-settings-back', () => {
            this.hideOverlay('settings-menu');
            if (this._previousScreen) {
                this.showScreen(this._previousScreen);
            }
        });

        // Game Over
        this._on('btn-retry', () => {
            this.engine.startNewGame();
        });

        this._on('btn-gameover-menu', () => {
            this.engine.setState(GAME_STATES.MENU);
        });

        // Level Complete
        this._on('btn-next-level', () => {
            this.engine.loadNextLevel();
        });

        this._on('btn-level-shop', () => {
            this._previousScreen = 'level-complete';
            this.showScreen('shop-screen');
            gameEvents.emit('ui:screenChanged', { screen: 'shop-screen' });
        });

        this._on('btn-level-menu', () => {
            this.engine.setState(GAME_STATES.MENU);
        });

        // Shop / Achievements / Leaderboard back buttons
        this._on('btn-shop-back', () => {
            const dest = this._previousScreen || 'main-menu';
            this.showScreen(dest);
        });

        this._on('btn-achievements-back', () => {
            const dest = this._previousScreen || 'main-menu';
            this.showScreen(dest);
        });

        this._on('btn-leaderboard-back', () => {
            const dest = this._previousScreen || 'main-menu';
            this.showScreen(dest);
        });
    }

    // ─── Volume Sliders ─────────────────────────────────────────

    /** Bind input events on volume sliders and sync display values. */
    _setupVolumeSliders() {
        const sliders = [
            { id: 'vol-master', type: 'master' },
            { id: 'vol-music', type: 'music' },
            { id: 'vol-sfx', type: 'sfx' },
        ];

        sliders.forEach(({ id, type }) => {
            const slider = document.getElementById(id);
            const valueEl = document.getElementById(`${id}-val`);
            if (!slider) return;

            slider.addEventListener('input', () => {
                const value = parseInt(slider.value, 10);
                if (valueEl) valueEl.textContent = `${value}%`;
                gameEvents.emit('audio:volumeChanged', { type, value: value / 100 });
            });
        });
    }

    // ─── State Change Listener ──────────────────────────────────

    /** Automatically show the correct screen when game state changes. */
    _listenForStateChanges() {
        gameEvents.on('game:stateChanged', ({ state }) => {
            switch (state) {
                case GAME_STATES.MENU:
                    this.showScreen('main-menu');
                    break;
                case GAME_STATES.PLAYING:
                    this.hideAllScreens();
                    break;
                case GAME_STATES.PAUSED:
                    this.showOverlay('pause-menu');
                    break;
                case GAME_STATES.GAME_OVER:
                    this.showOverlay('gameover-screen');
                    break;
                case GAME_STATES.LEVEL_COMPLETE:
                    this.showOverlay('level-complete');
                    break;
                case GAME_STATES.SHOP:
                    this.showScreen('shop-screen');
                    break;
                case GAME_STATES.ACHIEVEMENTS:
                    this.showScreen('achievements-screen');
                    break;
                case GAME_STATES.LEADERBOARD:
                    this.showScreen('leaderboard-screen');
                    break;
                case GAME_STATES.SETTINGS:
                    this.showScreen('settings-menu');
                    break;
            }
        });
    }

    // ─── Screen Management ──────────────────────────────────────

    /**
     * Hide every UI screen then activate the target screen.
     * @param {string} screenId - DOM id of the screen element
     */
    showScreen(screenId) {
        this.hideAllScreens();
        const el = document.getElementById(screenId);
        if (el) {
            el.classList.add('active');
            this._currentScreen = screenId;
        }
    }

    /** Remove 'active' class from all UI screens. */
    hideAllScreens() {
        this.screens.forEach(screen => screen.classList.remove('active'));
    }

    /**
     * Show an overlay screen without hiding the game canvas.
     * @param {string} screenId
     */
    showOverlay(screenId) {
        const el = document.getElementById(screenId);
        if (el) {
            el.classList.add('active');
            this._currentScreen = screenId;
        }
    }

    /**
     * Hide a specific overlay screen.
     * @param {string} screenId
     */
    hideOverlay(screenId) {
        const el = document.getElementById(screenId);
        if (el) el.classList.remove('active');
    }

    // ─── Helpers ────────────────────────────────────────────────

    /**
     * Safely bind a click handler to a button by ID.
     * @private
     * @param {string} btnId
     * @param {Function} handler
     */
    _on(btnId, handler) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    }
}
