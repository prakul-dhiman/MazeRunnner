/**
 * MazeBreaker: Shadow Protocol — Save Manager
 * LocalStorage persistence for game progress, high scores, and settings.
 */

export default class SaveManager {
    constructor() {
        /** @type {string} */
        this.STORAGE_KEY = 'mazebreaker_save';

        /** @type {string} */
        this.SETTINGS_KEY = 'mazebreaker_settings';
    }

    // ─── Game Save ──────────────────────────────────────────────

    /**
     * Persist game state to localStorage.
     * @param {object} data
     * @param {number} data.currentLevel
     * @param {number} data.coins
     * @param {number} data.totalCoins
     * @param {string[]} data.upgrades
     * @param {string[]} data.achievements
     * @param {object[]} data.highScores
     * @param {object} data.stats
     * @param {object} data.settings
     */
    save(data) {
        try {
            const payload = {
                ...data,
                savedAt: Date.now(),
                version: 1,
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('[SaveManager] Failed to save:', e.message);
        }
    }

    /**
     * Load game state from localStorage.
     * @returns {object|null} Parsed save data, or null if none exists / invalid
     */
    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return null;

            // Basic validation
            if (typeof data.currentLevel !== 'number') data.currentLevel = 1;
            if (typeof data.coins !== 'number') data.coins = 0;
            if (!Array.isArray(data.upgrades)) data.upgrades = [];
            if (!Array.isArray(data.achievements)) data.achievements = [];
            if (!Array.isArray(data.highScores)) data.highScores = [];
            if (!data.stats || typeof data.stats !== 'object') data.stats = {};

            return data;
        } catch {
            return null;
        }
    }

    /**
     * Check whether a save file exists.
     * @returns {boolean}
     */
    hasSaveData() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== null;
        } catch {
            return false;
        }
    }

    /** Delete the save file. */
    deleteSave() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch { /* ignore */ }
    }

    // ─── High Scores ────────────────────────────────────────────

    /**
     * Add a high-score entry, keeping only the top 10.
     * @param {object} entry - { score, level, time, date }
     */
    saveHighScore(entry) {
        const data = this.load() ?? this._defaultData();
        const scores = data.highScores ?? [];

        scores.push({
            score: entry.score ?? 0,
            level: entry.level ?? 1,
            time: entry.time ?? 0,
            date: entry.date ?? Date.now(),
        });

        // Sort descending by score, keep top 10
        scores.sort((a, b) => b.score - a.score);
        data.highScores = scores.slice(0, 10);

        this.save(data);
    }

    /**
     * Get the sorted list of high scores.
     * @returns {object[]}
     */
    getHighScores() {
        const data = this.load();
        const scores = data?.highScores ?? [];
        return scores.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    // ─── Settings ───────────────────────────────────────────────

    /**
     * Save audio/display settings separately.
     * @param {object} settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch { /* ignore */ }
    }

    /**
     * Load settings from localStorage.
     * @returns {object|null}
     */
    loadSettings() {
        try {
            const raw = localStorage.getItem(this.SETTINGS_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // ─── Cumulative Stats ───────────────────────────────────────

    /**
     * Get cumulative play statistics.
     * @returns {object}
     */
    getStats() {
        const data = this.load();
        return data?.stats ?? {
            totalPlayTime: 0,
            totalDeaths: 0,
            totalLevelsCompleted: 0,
            totalCoinsCollected: 0,
            totalRelicsCollected: 0,
            totalEnemiesAvoided: 0,
        };
    }

    /**
     * Merge incremental stat updates into the persisted totals.
     * @param {object} statUpdates - Key/value pairs to add to existing stats
     */
    updateStats(statUpdates) {
        const data = this.load() ?? this._defaultData();
        const stats = data.stats ?? {};

        for (const [key, value] of Object.entries(statUpdates)) {
            if (typeof value === 'number') {
                stats[key] = (stats[key] ?? 0) + value;
            } else {
                stats[key] = value;
            }
        }

        data.stats = stats;
        this.save(data);
    }

    // ─── Internal ───────────────────────────────────────────────

    /**
     * Create a default empty save structure.
     * @private
     * @returns {object}
     */
    _defaultData() {
        return {
            currentLevel: 1,
            coins: 0,
            totalCoins: 0,
            upgrades: [],
            achievements: [],
            highScores: [],
            stats: {},
            settings: {},
        };
    }
}
