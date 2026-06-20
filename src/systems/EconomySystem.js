/**
 * MazeBreaker: Shadow Protocol — Economy System
 * Shop and upgrade management with prerequisite validation,
 * effect aggregation, and persistence via SaveManager.
 */

import { UPGRADES } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';

export default class EconomySystem {
    /**
     * @param {Object} [saveManager] - Reference to save system for persistence
     */
    constructor(saveManager) {
        /** @type {Object|null} */
        this._saveManager = saveManager ?? null;

        /** @type {Set<string>} IDs of purchased upgrades */
        this._purchasedUpgrades = new Set();

        /** @type {Map<string, number>} stat → combined multiplier or additive value */
        this._appliedEffects = new Map();

        /** @type {number} Lifetime coins spent on upgrades */
        this._totalSpent = 0;
    }

    /**
     * Initialize the economy system, optionally restoring from saved data.
     * @param {Array<string>} [savedUpgrades] - Previously purchased upgrade ids
     */
    init(savedUpgrades) {
        this._purchasedUpgrades.clear();
        this._appliedEffects.clear();
        this._totalSpent = 0;

        if (savedUpgrades && Array.isArray(savedUpgrades)) {
            for (const id of savedUpgrades) {
                this._purchasedUpgrades.add(id);
            }
            this._recalculateEffects();
        }
    }

    /**
     * Get all upgrades in a category with their purchase state.
     * @param {string} category - Category key from UPGRADES (e.g., 'mobility')
     * @returns {Array<Object>} Upgrades with { ...def, owned: boolean }
     */
    getUpgradesForCategory(category) {
        const defs = UPGRADES[category];
        if (!defs) return [];

        return defs.map((def) => ({
            ...def,
            owned: this._purchasedUpgrades.has(def.id),
        }));
    }

    /**
     * Check if a specific upgrade can be purchased.
     * Validates: affordable, not already owned, prerequisites met.
     * @param {string} upgradeId - Upgrade id
     * @param {number} coins - Player's current coin count
     * @returns {boolean}
     */
    canPurchase(upgradeId, coins) {
        // Already owned
        if (this._purchasedUpgrades.has(upgradeId)) return false;

        const def = this._findUpgradeDef(upgradeId);
        if (!def) return false;

        // Affordability
        if (coins < def.cost) return false;

        // Prerequisite check
        if (def.requires && !this._purchasedUpgrades.has(def.requires)) return false;

        return true;
    }

    /**
     * Purchase an upgrade, deducting coins from the inventory.
     * @param {string} upgradeId - Upgrade id
     * @param {Object} inventory - InventorySystem instance (must have spendCoins)
     * @returns {boolean} True if purchase succeeded
     */
    purchase(upgradeId, inventory) {
        if (!inventory) return false;

        const def = this._findUpgradeDef(upgradeId);
        if (!def) return false;

        if (!this.canPurchase(upgradeId, inventory.coins)) return false;

        // Deduct coins
        const spent = inventory.spendCoins(def.cost);
        if (!spent) return false;

        // Register purchase
        this._purchasedUpgrades.add(upgradeId);
        this._totalSpent += def.cost;

        // Recalculate aggregated effects
        this._recalculateEffects();

        // Persist if save manager is available
        if (this._saveManager?.save) {
            this._saveManager.save('upgrades', this.getSaveData());
        }

        gameEvents.emit('economy:purchased', {
            upgradeId,
            name: def.name,
            cost: def.cost,
            effect: def.effect,
        });

        return true;
    }

    /**
     * Check whether an upgrade has been purchased.
     * @param {string} upgradeId
     * @returns {boolean}
     */
    isOwned(upgradeId) {
        return this._purchasedUpgrades.has(upgradeId);
    }

    /**
     * Get the combined effect value for a stat across all purchased upgrades.
     * For multiplicative effects, values are multiplied together.
     * For additive effects, values are summed.
     * @param {string} stat - The stat key (e.g., 'moveSpeed', 'maxHp')
     * @returns {number} Combined value (multiplier default: 1, additive default: 0)
     */
    getEffect(stat) {
        return this._appliedEffects.get(stat) ?? (this._isAdditiveStat(stat) ? 0 : 1);
    }

    /**
     * Apply all purchased upgrade effects to a player entity.
     * @param {Object} player - Player entity to mutate
     */
    applyUpgrades(player) {
        if (!player) return;

        // Multiplicative stats
        const speedMult = this.getEffect('moveSpeed');
        if (player.baseSpeed != null) {
            player.speed = player.baseSpeed * speedMult;
        }

        const staminaMult = this.getEffect('maxStamina');
        if (player.baseMaxStamina != null) {
            player.maxStamina = player.baseMaxStamina * staminaMult;
        }

        const staminaRegenMult = this.getEffect('staminaRegen');
        if (player.baseStaminaRegen != null) {
            player.staminaRegen = player.baseStaminaRegen * staminaRegenMult;
        }

        const visionMult = this.getEffect('visionRadius');
        if (player.baseVisionRadius != null) {
            player.visionRadius = Math.round(player.baseVisionRadius * visionMult);
        }

        const damageResist = this.getEffect('damageResist');
        player.damageResist = damageResist;

        // Additive stats
        const hpAdd = this.getEffect('maxHp');
        if (player.baseMaxHp != null && hpAdd > 0) {
            player.maxHp = player.baseMaxHp + hpAdd;
        }

        const autoHeal = this.getEffect('autoHeal');
        if (autoHeal > 0) {
            player.autoHealRate = autoHeal;
        }

        // Boolean unlocks
        if (this._appliedEffects.has('minimap')) {
            player.hasMinimap = true;
        }
    }

    /**
     * Get save data — array of purchased upgrade ids.
     * @returns {Array<string>}
     */
    getSaveData() {
        return [...this._purchasedUpgrades];
    }

    /**
     * Load save data — restore purchased upgrades.
     * @param {Array<string>} data - Array of upgrade ids
     */
    loadSaveData(data) {
        this.init(data);
    }

    /**
     * Get total coins spent on upgrades.
     * @returns {number}
     */
    getTotalSpent() {
        return this._totalSpent;
    }

    /**
     * Find an upgrade definition by id across all categories.
     * @param {string} upgradeId
     * @returns {Object|null}
     */
    _findUpgradeDef(upgradeId) {
        for (const category of Object.keys(UPGRADES)) {
            const found = UPGRADES[category].find((u) => u.id === upgradeId);
            if (found) return found;
        }
        return null;
    }

    /**
     * Recalculate all aggregated effects from purchased upgrades.
     */
    _recalculateEffects() {
        this._appliedEffects.clear();

        for (const upgradeId of this._purchasedUpgrades) {
            const def = this._findUpgradeDef(upgradeId);
            if (!def || !def.effect) continue;

            const { stat } = def.effect;

            if (def.effect.mult != null) {
                // Multiplicative: multiply together
                const current = this._appliedEffects.get(stat) ?? 1;
                this._appliedEffects.set(stat, current * def.effect.mult);
            } else if (def.effect.add != null) {
                // Additive: sum together
                const current = this._appliedEffects.get(stat) ?? 0;
                this._appliedEffects.set(stat, current + def.effect.add);
            } else if (def.effect.value != null) {
                // Value-based (booleans, fixed values)
                this._appliedEffects.set(stat, def.effect.value);
            }
        }
    }

    /**
     * Determine if a stat uses additive aggregation.
     * @param {string} stat
     * @returns {boolean}
     */
    _isAdditiveStat(stat) {
        return stat === 'maxHp' || stat === 'autoHeal';
    }

    /**
     * Get a summary of all purchased upgrades with their details.
     * @returns {Array<Object>}
     */
    getPurchasedUpgrades() {
        const result = [];
        for (const id of this._purchasedUpgrades) {
            const def = this._findUpgradeDef(id);
            if (def) result.push({ ...def, owned: true });
        }
        return result;
    }
}
