/**
 * MazeBreaker: Shadow Protocol — Stealth System
 * Manages player visibility scoring and enemy detection meters.
 * Visibility is calculated from movement state, distance, and abilities.
 * Each enemy independently tracks a detection meter that triggers
 * state transitions at configurable thresholds.
 */

import { TILE_SIZE, PLAYER, AI_STATES } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';
import { distance, angleBetween, isAngleInCone } from '../utils/MathUtils.js';

/** Detection meter threshold for yellow "noticed" indicator */
const NOTICED_THRESHOLD = 0.3;

/** Detection meter threshold for full detection (chase trigger) */
const DETECTED_THRESHOLD = 1.0;

/** Rate at which detection decays when player is not visible (per second) */
const DECAY_RATE = 0.4;

/** Base visibility multiplier when player is stationary */
const STATIONARY_MULT = 0.3;

/** Visibility multiplier when player is sprinting */
const SPRINT_MULT = 1.5;

export default class StealthSystem {
    constructor() {
        /** @type {number} Current calculated player visibility score [0, 1] */
        this._playerVisibility = 1.0;

        /** @type {Map<number, number>} Enemy ID → detection meter [0, 1] */
        this._detectionMeters = new Map();

        /** @type {Set<number>} Enemies that have already fired the 'noticed' event */
        this._noticedSet = new Set();

        /** @type {Set<number>} Enemies that have already fired the 'detected' event */
        this._detectedSet = new Set();
    }

    /**
     * Update visibility scoring and detection meters for all enemies.
     * @param {number} dt - Delta time in milliseconds
     * @param {Object} player - Player entity
     * @param {Array} enemies - Array of enemy entities
     * @param {Array[]} grid - Maze grid for line-of-sight checks
     */
    update(dt, player, enemies, grid) {
        const dtSec = dt / 1000;

        // Calculate base player visibility
        this._playerVisibility = this._calculateVisibility(player);

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy || enemy.isDead || enemy.isDisabled) continue;

            const enemyId = enemy.id ?? i;

            // Initialize detection meter if needed
            if (!this._detectionMeters.has(enemyId)) {
                this._detectionMeters.set(enemyId, 0);
            }

            let meter = this._detectionMeters.get(enemyId);
            const canSee = this._canEnemyDetect(enemy, player, grid);

            if (canSee && this._playerVisibility > 0) {
                // Increase detection based on enemy detection rate and visibility
                const rate = (enemy.config?.detectionRate ?? 0.6);
                meter += rate * this._playerVisibility * dtSec;
            } else {
                // Decay detection when player is not visible
                meter -= DECAY_RATE * dtSec;
            }

            // Clamp meter to [0, 1]
            meter = Math.max(0, Math.min(DETECTED_THRESHOLD, meter));
            this._detectionMeters.set(enemyId, meter);

            // Threshold events
            if (meter >= DETECTED_THRESHOLD && !this._detectedSet.has(enemyId)) {
                this._detectedSet.add(enemyId);
                if (enemy.fsm) {
                    enemy.fsm.transition(AI_STATES.CHASE);
                }
                gameEvents.emit('player:detected', {
                    enemyId,
                    enemyType: enemy.config?.type ?? 'unknown',
                    meter,
                });
            } else if (meter >= NOTICED_THRESHOLD && !this._noticedSet.has(enemyId)) {
                this._noticedSet.add(enemyId);
                gameEvents.emit('player:noticed', {
                    enemyId,
                    enemyType: enemy.config?.type ?? 'unknown',
                    meter,
                });
            }

            // Clear notice/detect flags when meter drops below thresholds
            if (meter < NOTICED_THRESHOLD) {
                this._noticedSet.delete(enemyId);
            }
            if (meter < DETECTED_THRESHOLD) {
                this._detectedSet.delete(enemyId);
            }
        }
    }

    /**
     * Calculate the player's current visibility score.
     * @param {Object} player
     * @returns {number} Visibility in [0, 1]
     */
    _calculateVisibility(player) {
        // Cloak completely hides the player
        if (player.isCloaked || player.isVisible === false) return 0;

        let visibility = 1.0;

        // Stationary players are harder to spot
        const isMoving = (player.vx !== 0 || player.vy !== 0) ||
                          (player.dx !== 0 || player.dy !== 0);
        if (!isMoving) {
            visibility *= STATIONARY_MULT;
        }

        // Sprinting makes player much more visible
        if (player.isSprinting) {
            visibility *= SPRINT_MULT;
        }

        return Math.min(1, Math.max(0, visibility));
    }

    /**
     * Check whether a specific enemy can detect the player.
     * Tests distance, vision cone, and line-of-sight occlusion.
     * @param {Object} enemy
     * @param {Object} player
     * @param {Array[]} grid
     * @returns {boolean}
     */
    _canEnemyDetect(enemy, player, grid) {
        const ex = enemy.x ?? (enemy.col * TILE_SIZE + TILE_SIZE / 2);
        const ey = enemy.y ?? (enemy.row * TILE_SIZE + TILE_SIZE / 2);
        const px = player.x ?? (player.col * TILE_SIZE + TILE_SIZE / 2);
        const py = player.y ?? (player.row * TILE_SIZE + TILE_SIZE / 2);

        // Distance check (in tiles)
        const dist = distance(ex, ey, px, py) / TILE_SIZE;
        const visionRange = enemy.config?.visionRange ?? enemy.visionRange ?? 4;

        if (dist > visionRange) return false;

        // Vision cone check (skip if sentinel with 360° vision)
        const visionAngle = enemy.config?.visionAngle ?? enemy.visionAngle ?? Math.PI / 3;
        if (visionAngle < Math.PI * 2 - 0.01) {
            const angleToPlayer = angleBetween(ex, ey, px, py);
            const facingAngle = enemy.facingAngle ?? enemy.angle ?? 0;
            if (!isAngleInCone(angleToPlayer, facingAngle, visionAngle / 2)) {
                return false;
            }
        }

        // Line-of-sight check via Bresenham raycast
        if (!this._hasLineOfSight(enemy.col, enemy.row, player.col, player.row, grid)) {
            return false;
        }

        return true;
    }

    /**
     * Bresenham line-of-sight check through the grid.
     * @param {number} x0 - Start column
     * @param {number} y0 - Start row
     * @param {number} x1 - Target column
     * @param {number} y1 - Target row
     * @param {Array[]} grid - Maze grid
     * @returns {boolean} True if line of sight is clear
     */
    _hasLineOfSight(x0, y0, x1, y1, grid) {
        if (!grid || !grid.length) return true;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let cx = x0;
        let cy = y0;

        while (cx !== x1 || cy !== y1) {
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx += sx; }
            if (e2 < dx) { err += dx; cy += sy; }

            // Don't check the final cell (player's cell)
            if (cx === x1 && cy === y1) break;

            // Wall check
            if (cy >= 0 && cy < grid.length && cx >= 0 && cx < grid[0].length) {
                const cell = grid[cy][cx];
                if (cell === 1 || cell?.wall || cell?.isWall) return false;
            } else {
                return false;
            }
        }

        return true;
    }

    /**
     * Get the current player visibility score.
     * @returns {number} Visibility in [0, 1]
     */
    getPlayerVisibility() {
        return this._playerVisibility;
    }

    /**
     * Get the detection meter value for a specific enemy.
     * @param {number} enemyId
     * @returns {number} Detection meter in [0, 1]
     */
    getDetectionMeter(enemyId) {
        return this._detectionMeters.get(enemyId) ?? 0;
    }

    /**
     * Reset all detection meters and tracking sets.
     */
    resetDetection() {
        this._detectionMeters.clear();
        this._noticedSet.clear();
        this._detectedSet.clear();
        this._playerVisibility = 1.0;
    }
}
