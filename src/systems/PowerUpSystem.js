/**
 * MazeBreaker: Shadow Protocol — Power-Up System
 * Manages five player abilities with cooldowns, activation timers,
 * input handling, and unlock gating. Supports upgrade multipliers.
 *
 * Abilities:
 *  1 - Time Freeze: freezes all enemies
 *  2 - Decoy Signal: deploys a false position marker
 *  3 - EMP Pulse:   disables nearby enemies
 *  4 - Teleport:    two-press beacon system
 *  5 - Cloak:       temporary invisibility
 */

import { ABILITIES, TILE_SIZE } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';
import { distance } from '../utils/MathUtils.js';

export default class PowerUpSystem {
    /**
     * @param {Object} inputManager - Reference to the InputManager
     */
    constructor(inputManager) {
        /** @type {Object} */
        this._input = inputManager;

        /** @type {Map<string, Object>} Ability id → runtime state */
        this._abilities = new Map();

        /** @type {{x: number, y: number}|null} Teleport beacon position */
        this._teleportBeacon = null;

        /** @type {number} Cooldown multiplier from upgrades (lower = faster) */
        this._cooldownMult = 1.0;

        /** @type {number} Duration multiplier from upgrades (higher = longer) */
        this._durationMult = 1.0;

        /** @type {Object|null} Active decoy marker */
        this._decoyMarker = null;
    }

    /**
     * Initialize all five abilities from constants.
     */
    init() {
        this._abilities.clear();
        this._teleportBeacon = null;
        this._decoyMarker = null;

        const defs = [
            ABILITIES.TIME_FREEZE,
            ABILITIES.DECOY,
            ABILITIES.EMP,
            ABILITIES.TELEPORT,
            ABILITIES.CLOAK,
        ];

        for (const def of defs) {
            this._abilities.set(def.id, {
                def,
                currentCooldown: 0,
                isActive: false,
                activeTimer: 0,
                unlocked: true, // default unlocked; can be gated later
            });
        }
    }

    /**
     * Tick cooldowns, active timers, and check ability input.
     * @param {number} dt - Delta time in milliseconds
     * @param {Object} player - Player entity
     * @param {Array} enemies - Array of enemy entities
     * @param {Object} gameEngine - Reference to the game engine
     */
    update(dt, player, enemies, gameEngine) {
        for (const [id, ability] of this._abilities) {
            // Tick cooldown
            if (ability.currentCooldown > 0) {
                ability.currentCooldown = Math.max(0, ability.currentCooldown - dt);
            }

            // Tick active timer and handle expiration
            if (ability.isActive && ability.activeTimer > 0) {
                ability.activeTimer -= dt;
                if (ability.activeTimer <= 0) {
                    this._deactivate(id, player, enemies);
                }
            }

            // Check input for activation
            const keyCode = ability.def.keyCode;
            if (this._input && this._input.isKeyPressed?.(keyCode)) {
                if (ability.unlocked && ability.currentCooldown <= 0 && !ability.isActive) {
                    this._activate(id, player, enemies, gameEngine);
                } else if (id === 'teleport' && this._teleportBeacon && ability.currentCooldown <= 0) {
                    // Second press: teleport to beacon
                    this._executeTeleport(player);
                }
            }
        }

        // Update decoy marker lifetime
        if (this._decoyMarker) {
            this._decoyMarker.life -= dt;
            if (this._decoyMarker.life <= 0) {
                this._decoyMarker = null;
            }
        }
    }

    /**
     * Activate an ability by id.
     * @param {string} id - Ability id
     * @param {Object} player
     * @param {Array} enemies
     * @param {Object} gameEngine
     */
    _activate(id, player, enemies, gameEngine) {
        const ability = this._abilities.get(id);
        if (!ability) return;

        const def = ability.def;
        const effectDuration = def.duration * this._durationMult;

        switch (id) {
            case 'timeFreeze':
                ability.isActive = true;
                ability.activeTimer = effectDuration;
                // Freeze all enemies
                if (enemies) {
                    for (const enemy of enemies) {
                        if (enemy && !enemy.isDead) enemy.isFrozen = true;
                    }
                }
                gameEvents.emit('ability:timeFreeze', { duration: effectDuration });
                break;

            case 'decoy':
                ability.isActive = true;
                ability.activeTimer = effectDuration;
                // Place decoy at player position
                this._decoyMarker = {
                    x: player.x,
                    y: player.y,
                    col: player.col,
                    row: player.row,
                    life: effectDuration,
                };
                // Direct enemies to investigate decoy
                if (enemies) {
                    for (const enemy of enemies) {
                        if (enemy && !enemy.isDead && enemy.fsm) {
                            enemy.investigateTarget = { col: player.col, row: player.row };
                        }
                    }
                }
                gameEvents.emit('ability:decoy', {
                    x: player.x,
                    y: player.y,
                    duration: effectDuration,
                });
                break;

            case 'emp': {
                ability.isActive = true;
                ability.activeTimer = effectDuration;
                const empRadius = (def.radius ?? 4) * TILE_SIZE;
                // Disable enemies within radius
                if (enemies) {
                    for (const enemy of enemies) {
                        if (!enemy || enemy.isDead) continue;
                        const ex = enemy.x ?? (enemy.col * TILE_SIZE + TILE_SIZE / 2);
                        const ey = enemy.y ?? (enemy.row * TILE_SIZE + TILE_SIZE / 2);
                        const dist = distance(player.x, player.y, ex, ey);
                        if (dist <= empRadius) {
                            if (enemy.disable) {
                                enemy.disable(effectDuration);
                            } else {
                                enemy.isDisabled = true;
                                enemy._empTimer = effectDuration;
                            }
                        }
                    }
                }
                gameEvents.emit('ability:emp', {
                    x: player.x,
                    y: player.y,
                    radius: def.radius,
                    duration: effectDuration,
                });
                break;
            }

            case 'teleport':
                // First press: place beacon
                this._teleportBeacon = { x: player.x, y: player.y };
                gameEvents.emit('ability:teleportBeacon', {
                    x: player.x,
                    y: player.y,
                });
                // Don't set active or cooldown yet — wait for second press
                return;

            case 'cloak':
                ability.isActive = true;
                ability.activeTimer = effectDuration;
                player.isVisible = false;
                player.isCloaked = true;
                gameEvents.emit('ability:cloak', { duration: effectDuration });
                break;

            default:
                return;
        }

        // Set cooldown (teleport handled separately)
        ability.currentCooldown = def.cooldown * this._cooldownMult;
    }

    /**
     * Execute the second-press teleport to the beacon location.
     * @param {Object} player
     */
    _executeTeleport(player) {
        if (!this._teleportBeacon) return;

        const beacon = this._teleportBeacon;
        player.x = beacon.x;
        player.y = beacon.y;
        player.col = Math.floor(beacon.x / TILE_SIZE);
        player.row = Math.floor(beacon.y / TILE_SIZE);

        gameEvents.emit('ability:teleport', {
            fromX: player.x,
            fromY: player.y,
            toX: beacon.x,
            toY: beacon.y,
        });

        // Start cooldown now
        const ability = this._abilities.get('teleport');
        if (ability) {
            ability.currentCooldown = ability.def.cooldown * this._cooldownMult;
        }

        this._teleportBeacon = null;
    }

    /**
     * Deactivate an ability when its timer expires.
     * @param {string} id
     * @param {Object} player
     * @param {Array} enemies
     */
    _deactivate(id, player, enemies) {
        const ability = this._abilities.get(id);
        if (!ability) return;

        ability.isActive = false;
        ability.activeTimer = 0;

        switch (id) {
            case 'timeFreeze':
                if (enemies) {
                    for (const enemy of enemies) {
                        if (enemy) enemy.isFrozen = false;
                    }
                }
                gameEvents.emit('ability:timeFreezeEnd');
                break;

            case 'decoy':
                this._decoyMarker = null;
                gameEvents.emit('ability:decoyEnd');
                break;

            case 'emp':
                // Enemies re-enable themselves via their own timers
                gameEvents.emit('ability:empEnd');
                break;

            case 'cloak':
                player.isVisible = true;
                player.isCloaked = false;
                gameEvents.emit('ability:cloakEnd');
                break;
        }
    }

    /**
     * Get the current state of a specific ability for HUD rendering.
     * @param {string} id - Ability id
     * @returns {Object} Ability state
     */
    getAbilityState(id) {
        const ability = this._abilities.get(id);
        if (!ability) return null;

        const def = ability.def;
        const totalCooldown = def.cooldown * this._cooldownMult;

        return {
            id: def.id,
            name: def.name,
            icon: def.icon,
            color: def.color,
            key: def.key,
            ready: ability.currentCooldown <= 0 && !ability.isActive,
            cooldownRemaining: ability.currentCooldown,
            cooldownPercent: totalCooldown > 0 ? ability.currentCooldown / totalCooldown : 0,
            isActive: ability.isActive,
            unlocked: ability.unlocked,
        };
    }

    /**
     * Get all ability states for HUD rendering.
     * @returns {Array<Object>}
     */
    getAllStates() {
        const states = [];
        for (const [id] of this._abilities) {
            states.push(this.getAbilityState(id));
        }
        return states;
    }

    /**
     * Manually activate an ability by id (e.g., from external trigger).
     * @param {string} abilityId
     * @param {Object} player
     * @param {Array} enemies
     * @param {Object} gameEngine
     */
    activate(abilityId, player, enemies, gameEngine) {
        const ability = this._abilities.get(abilityId);
        if (!ability || !ability.unlocked || ability.currentCooldown > 0 || ability.isActive) return;
        this._activate(abilityId, player, enemies, gameEngine);
    }

    /**
     * Apply a cooldown multiplier from upgrades. Lower = faster cooldowns.
     * @param {number} mult
     */
    applyCooldownMultiplier(mult) {
        this._cooldownMult = mult;
    }

    /**
     * Apply a duration multiplier from upgrades. Higher = longer durations.
     * @param {number} mult
     */
    applyDurationMultiplier(mult) {
        this._durationMult = mult;
    }

    /**
     * Get the current decoy marker, if active.
     * @returns {Object|null}
     */
    getDecoyMarker() {
        return this._decoyMarker;
    }

    /**
     * Get the teleport beacon position, if placed.
     * @returns {{x: number, y: number}|null}
     */
    getTeleportBeacon() {
        return this._teleportBeacon;
    }
}
