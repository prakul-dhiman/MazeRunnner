/**
 * MazeBreaker: Shadow Protocol — Progression System
 * XP accumulation and player leveling.
 * XP thresholds scale linearly: required = level × 100.
 * Calculates level completion rewards from performance stats.
 */

import { gameEvents } from '../utils/EventBus.js';

/** Base XP required per level (multiplied by current level) */
const XP_PER_LEVEL = 100;

/** XP reward multipliers for level completion scoring */
const REWARD_CONFIG = {
    BASE_COMPLETION: 50,
    PER_RELIC: 20,
    STEALTH_BONUS: 40,
    NO_DAMAGE_BONUS: 30,
    TIME_BONUS_MAX: 50,
    TIME_BONUS_THRESHOLD: 90, // seconds — under this earns full time bonus
};

export default class ProgressionSystem {
    constructor() {
        /** @type {number} Current XP within the current level */
        this.xp = 0;

        /** @type {number} Player progression level (not maze level) */
        this.level = 1;

        /** @type {number} Lifetime total XP earned */
        this.totalXp = 0;
    }

    /**
     * Add XP and process any level-ups.
     * @param {number} amount - XP to add
     */
    addXp(amount) {
        if (amount <= 0) return;

        this.xp += amount;
        this.totalXp += amount;

        gameEvents.emit('progression:xpGained', {
            amount,
            currentXp: this.xp,
            totalXp: this.totalXp,
            level: this.level,
        });

        // Process level-ups (could be multiple in one call)
        let required = this._getRequiredXp();
        while (this.xp >= required) {
            this.xp -= required;
            this.level++;
            required = this._getRequiredXp();

            gameEvents.emit('progression:levelUp', {
                newLevel: this.level,
                totalXp: this.totalXp,
            });
        }
    }

    /**
     * Get XP required for the current level.
     * @returns {number}
     */
    _getRequiredXp() {
        return this.level * XP_PER_LEVEL;
    }

    /**
     * Get current XP progress for HUD display.
     * @returns {{ current: number, required: number, percentage: number }}
     */
    getXpProgress() {
        const required = this._getRequiredXp();
        return {
            current: this.xp,
            required,
            percentage: required > 0 ? this.xp / required : 0,
        };
    }

    /**
     * Calculate XP rewards for completing a maze level.
     * @param {number} mazeLevel - The maze level completed
     * @param {Object} stats - Completion statistics
     * @param {number} stats.relicsCollected - Number of relics collected
     * @param {boolean} stats.wasStealthy - Completed without detection
     * @param {boolean} stats.noDamage - Completed without taking damage
     * @param {number} stats.completionTime - Time in seconds to complete
     * @returns {{ total: number, breakdown: Object }}
     */
    calculateLevelRewards(mazeLevel, stats) {
        const breakdown = {
            base: REWARD_CONFIG.BASE_COMPLETION,
            relics: 0,
            stealth: 0,
            noDamage: 0,
            time: 0,
            levelScaling: 0,
        };

        // Relic bonus
        breakdown.relics = (stats.relicsCollected ?? 0) * REWARD_CONFIG.PER_RELIC;

        // Stealth bonus
        if (stats.wasStealthy) {
            breakdown.stealth = REWARD_CONFIG.STEALTH_BONUS;
        }

        // No-damage bonus
        if (stats.noDamage) {
            breakdown.noDamage = REWARD_CONFIG.NO_DAMAGE_BONUS;
        }

        // Time bonus (proportional to how fast, capped at threshold)
        if (stats.completionTime != null && stats.completionTime < REWARD_CONFIG.TIME_BONUS_THRESHOLD) {
            const ratio = 1 - (stats.completionTime / REWARD_CONFIG.TIME_BONUS_THRESHOLD);
            breakdown.time = Math.round(REWARD_CONFIG.TIME_BONUS_MAX * ratio);
        }

        // Level scaling bonus (deeper levels reward more)
        breakdown.levelScaling = Math.floor(mazeLevel * 5);

        const total = breakdown.base
            + breakdown.relics
            + breakdown.stealth
            + breakdown.noDamage
            + breakdown.time
            + breakdown.levelScaling;

        return { total, breakdown };
    }

    /**
     * Get the current player progression level.
     * @returns {number}
     */
    getLevel() {
        return this.level;
    }

    /**
     * Reset progression for a new game (upgrades persist externally).
     */
    reset() {
        this.xp = 0;
        this.level = 1;
        this.totalXp = 0;
    }

    /**
     * Serialize progression state for saving.
     * @returns {Object}
     */
    getSaveData() {
        return {
            xp: this.xp,
            level: this.level,
            totalXp: this.totalXp,
        };
    }

    /**
     * Restore progression state from save data.
     * @param {Object} data
     */
    loadSaveData(data) {
        if (!data) return;
        this.xp = data.xp ?? 0;
        this.level = data.level ?? 1;
        this.totalXp = data.totalXp ?? 0;
    }
}
