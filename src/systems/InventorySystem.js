/**
 * MazeBreaker: Shadow Protocol — Inventory System
 * Tracks collected items: coins, relics, and keys.
 * Persists lifetime coin totals across levels.
 * Calculates level completion rewards based on performance bonuses.
 */

import { ECONOMY } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';

export default class InventorySystem {
    constructor() {
        /** @type {number} Current coin balance (persists across levels) */
        this.coins = 0;

        /** @type {number} Lifetime coins earned */
        this.totalCoins = 0;

        /** @type {number} Relics collected in current level */
        this.relics = 0;

        /** @type {number} Lifetime relics collected */
        this.totalRelics = 0;

        /** @type {number} Keys held in current level */
        this.keys = 0;

        /** @type {number} Relics required to complete the current level */
        this.relicsRequired = 0;
    }

    /**
     * Collect a coin with a given value.
     * @param {number} [value] - Coin value (defaults to ECONOMY.COIN_VALUE)
     */
    collectCoin(value) {
        const coinValue = value ?? ECONOMY.COIN_VALUE;
        this.coins += coinValue;
        this.totalCoins += coinValue;

        gameEvents.emit('item:coinCollected', {
            value: coinValue,
            total: this.coins,
        });
    }

    /**
     * Collect a relic in the current level.
     */
    collectRelic() {
        this.relics++;
        this.totalRelics++;

        gameEvents.emit('item:relicCollected', {
            current: this.relics,
            required: this.relicsRequired,
        });
    }

    /**
     * Collect a key.
     */
    collectKey() {
        this.keys++;

        gameEvents.emit('item:keyCollected', {
            keys: this.keys,
        });
    }

    /**
     * Check if all required relics for the current level are collected.
     * @returns {boolean}
     */
    hasAllRelics() {
        return this.relics >= this.relicsRequired;
    }

    /**
     * Use a key if one is available.
     * @returns {boolean} True if a key was consumed
     */
    useKey() {
        if (this.keys > 0) {
            this.keys--;
            gameEvents.emit('item:keyUsed', { keysRemaining: this.keys });
            return true;
        }
        return false;
    }

    /**
     * Spend coins if the player can afford it.
     * @param {number} amount - Amount to spend
     * @returns {boolean} True if coins were deducted
     */
    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            gameEvents.emit('item:coinsSpent', {
                amount,
                remaining: this.coins,
            });
            return true;
        }
        return false;
    }

    /**
     * Reset level-specific items for a new level.
     * Coins are preserved across levels.
     */
    resetLevelItems() {
        this.relics = 0;
        this.keys = 0;
        this.relicsRequired = 0;
    }

    /**
     * Get a snapshot of all inventory counts.
     * @returns {Object}
     */
    getStats() {
        return {
            coins: this.coins,
            totalCoins: this.totalCoins,
            relics: this.relics,
            totalRelics: this.totalRelics,
            keys: this.keys,
            relicsRequired: this.relicsRequired,
            hasAllRelics: this.hasAllRelics(),
        };
    }

    /**
     * Calculate and add level completion rewards.
     * @param {number} levelNum - Completed level number
     * @param {boolean} wasStealthy - Completed without being detected
     * @param {boolean} wasFast - Completed within speed bonus time
     * @param {boolean} noDamage - Completed without taking damage
     * @returns {Object} Breakdown of rewards earned
     */
    addLevelReward(levelNum, wasStealthy, wasFast, noDamage) {
        const rewards = {
            base: ECONOMY.LEVEL_COMPLETE_BONUS,
            stealth: 0,
            speed: 0,
            noDamage: 0,
            relics: 0,
            total: 0,
        };

        rewards.total += rewards.base;

        if (wasStealthy) {
            rewards.stealth = ECONOMY.STEALTH_BONUS;
            rewards.total += rewards.stealth;
        }

        if (wasFast) {
            rewards.speed = ECONOMY.SPEED_BONUS;
            rewards.total += rewards.speed;
        }

        if (noDamage) {
            rewards.noDamage = ECONOMY.NO_DAMAGE_BONUS;
            rewards.total += rewards.noDamage;
        }

        // Relic bonus
        rewards.relics = this.relics * ECONOMY.RELIC_VALUE;
        rewards.total += rewards.relics;

        // Apply reward
        this.coins += rewards.total;
        this.totalCoins += rewards.total;

        gameEvents.emit('item:levelReward', {
            levelNum,
            rewards,
        });

        return rewards;
    }

    /**
     * Serialize inventory state for saving.
     * @returns {Object}
     */
    getSaveData() {
        return {
            coins: this.coins,
            totalCoins: this.totalCoins,
            totalRelics: this.totalRelics,
        };
    }

    /**
     * Restore inventory state from save data.
     * @param {Object} data
     */
    loadSaveData(data) {
        if (!data) return;
        this.coins = data.coins ?? 0;
        this.totalCoins = data.totalCoins ?? 0;
        this.totalRelics = data.totalRelics ?? 0;
    }
}
