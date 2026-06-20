/**
 * MazeBreaker: Shadow Protocol — Achievement Manager
 * Tracks, evaluates, and unlocks achievements based on game state.
 */

import { ACHIEVEMENTS } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';

export default class AchievementManager {
    /**
     * @param {object} saveManager - SaveManager for persistence
     */
    constructor(saveManager) {
        /** @type {object} */
        this.saveManager = saveManager;

        /** @type {Set<string>} IDs of unlocked achievements */
        this.unlockedAchievements = new Set();

        /** @type {HTMLElement|null} */
        this._toastEl = document.getElementById('achievement-toast');

        /** @type {HTMLElement|null} */
        this._toastNameEl = document.getElementById('toast-name');

        /** @type {number|null} Toast dismiss timer */
        this._toastTimer = null;
    }

    // ─── Initialisation ─────────────────────────────────────────

    /**
     * Load previously unlocked achievements from save data.
     * @param {string[]} [savedAchievements] - Array of unlocked IDs
     */
    init(savedAchievements) {
        this.unlockedAchievements.clear();

        const ids = savedAchievements
            ?? this.saveManager?.load()?.achievements
            ?? [];

        ids.forEach(id => this.unlockedAchievements.add(id));
    }

    // ─── Condition Checking ─────────────────────────────────────

    /**
     * Evaluate all achievement conditions against the current game state.
     * Automatically unlocks any newly-met achievements.
     * @param {object} gameState
     * @param {number} gameState.level
     * @param {boolean} gameState.detected
     * @param {number} gameState.relicsCollected
     * @param {number} gameState.totalRelics
     * @param {number} gameState.abilitiesUsed
     * @param {number} gameState.damageTaken
     * @param {number} gameState.timeSeconds
     * @param {number} gameState.alertsTriggered
     * @param {number} gameState.explorationPercent
     * @param {number} gameState.totalCoins
     * @param {number} gameState.noDamageLevels
     * @param {boolean} gameState.allLevelsComplete
     */
    checkAchievements(gameState) {
        for (const achievement of ACHIEVEMENTS) {
            if (this.unlockedAchievements.has(achievement.id)) continue;

            const met = this._evaluateCondition(achievement.condition, gameState);
            if (met) {
                this.unlock(achievement.id);
            }
        }
    }

    /**
     * Evaluate a single condition string against game state.
     * @private
     * @param {string} condition
     * @param {object} state
     * @returns {boolean}
     */
    _evaluateCondition(condition, state) {
        switch (condition) {
            case 'noDetection':
                return !state.detected;
            case 'allRelics':
                return state.relicsCollected >= state.totalRelics && state.totalRelics > 0;
            case 'noAbilities':
                return state.abilitiesUsed === 0;
            case 'reachLevel10':
                return state.level >= 10;
            case 'reachLevel20':
                return state.level >= 20;
            case 'speedRun':
                return state.timeSeconds < 60;
            case 'noAlerts':
                return state.alertsTriggered === 0;
            case 'fullExplore':
                return state.explorationPercent >= 100;
            case 'totalCoins5000':
                return state.totalCoins >= 5000;
            case 'noDamage5':
                return state.noDamageLevels >= 5;
            case 'completeAll':
                return state.allLevelsComplete === true;
            case 'allAchievements':
                // All OTHER achievements must be unlocked
                return this.unlockedAchievements.size >= ACHIEVEMENTS.length - 1;
            default:
                return false;
        }
    }

    // ─── Unlock ─────────────────────────────────────────────────

    /**
     * Unlock an achievement by ID.
     * @param {string} achievementId
     */
    unlock(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) return;

        this.unlockedAchievements.add(achievementId);

        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievement) return;

        gameEvents.emit('achievement:unlocked', { achievement });
        this.showToast(achievement);

        // Persist immediately
        this._persist();
    }

    // ─── Query ──────────────────────────────────────────────────

    /**
     * Check if a specific achievement is unlocked.
     * @param {string} id
     * @returns {boolean}
     */
    isUnlocked(id) {
        return this.unlockedAchievements.has(id);
    }

    /**
     * Get all achievements with their unlock status.
     * @returns {{ id: string, name: string, desc: string, icon: string, condition: string, unlocked: boolean }[]}
     */
    getAll() {
        return ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: this.unlockedAchievements.has(a.id),
        }));
    }

    /**
     * Get the number of unlocked achievements.
     * @returns {number}
     */
    getUnlockedCount() {
        return this.unlockedAchievements.size;
    }

    /**
     * Get the set of unlocked IDs for save serialisation.
     * @returns {string[]}
     */
    getSaveData() {
        return [...this.unlockedAchievements];
    }

    // ─── Toast Notification ─────────────────────────────────────

    /**
     * Animate the achievement-toast element for 3 seconds.
     * @param {object} achievement - { name, icon }
     */
    showToast(achievement) {
        if (!this._toastEl) return;

        // Set content
        if (this._toastNameEl) {
            this._toastNameEl.textContent = achievement.name;
        }

        // Set icon if element exists
        const iconEl = this._toastEl.querySelector('.toast-icon');
        if (iconEl) {
            iconEl.textContent = achievement.icon ?? '★';
        }

        // Clear any existing timer
        if (this._toastTimer) clearTimeout(this._toastTimer);

        // Show
        this._toastEl.classList.add('show');

        // Auto-hide after 3 seconds
        this._toastTimer = setTimeout(() => {
            this._toastEl.classList.remove('show');
            this._toastTimer = null;
        }, 3000);
    }

    // ─── Persistence ────────────────────────────────────────────

    /** @private Persist unlocked achievements to save file. */
    _persist() {
        if (!this.saveManager) return;
        const data = this.saveManager.load() ?? {};
        data.achievements = this.getSaveData();
        this.saveManager.save(data);
    }
}
