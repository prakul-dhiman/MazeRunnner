/**
 * MazeBreaker: Shadow Protocol — Level Manager
 * Manages the full level lifecycle: generation, collectible tracking,
 * collision checks, win-condition evaluation, and enemy spawn planning.
 */

import { LEVEL, ENEMIES, TILE_SIZE } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';
import { randomInt, shuffle } from '../utils/MathUtils.js';
import MazeGenerator from './MazeGenerator.js';

export default class LevelManager {
    /**
     * @param {import('../engine/GameEngine.js').default} gameEngine
     */
    constructor(gameEngine) {
        /** @type {import('../engine/GameEngine.js').default} */
        this.engine = gameEngine;

        /** @type {MazeGenerator} */
        this._mazeGen = new MazeGenerator();

        // ── Level data ────────────────────────────────────────
        /** @type {number} Current level (1-based) */
        this.currentLevel = 0;

        /** @type {import('./MazeCell.js').default[][] | null} */
        this.grid = null;

        /** @type {number} */
        this.cols = 0;

        /** @type {number} */
        this.rows = 0;

        /** @type {{col: number, row: number} | null} */
        this.entrance = null;

        /** @type {{col: number, row: number} | null} */
        this.exit = null;

        // ── Collectibles ──────────────────────────────────────
        /**
         * Runtime collectible objects: { col, row, type, collected }
         * @type {Array<{col: number, row: number, type: string, collected: boolean}>}
         */
        this.collectibles = [];

        /** @type {number} Relics needed to unlock the exit */
        this.relicsRequired = 0;

        /** @type {number} */
        this.relicsCollected = 0;

        /** @type {number} */
        this.coinsCollected = 0;

        // ── Timing ────────────────────────────────────────────
        /** @type {number} Total time spent in this level (ms) */
        this.timeElapsed = 0;

        /** @type {number} Timestamp when the level started */
        this.levelStartTime = 0;

        /** @type {number} Animation timer for collectible rendering */
        this._animTimer = 0;
    }

    // ──────────────────────────────────────────────────────────
    //  Level loading
    // ──────────────────────────────────────────────────────────

    /**
     * Generate and prepare a new level.
     * @param {number} levelNum - 1-based level number
     */
    loadLevel(levelNum) {
        this.currentLevel = levelNum;

        // Determine maze size from level
        const { cols, rows } = this._mazeGen.getMazeSize(levelNum);
        this.cols = cols;
        this.rows = rows;

        // Generate
        const result = this._mazeGen.generate(cols, rows, levelNum);
        this.grid = result.grid;
        this.entrance = result.entrance;
        this.exit = result.exit;

        // Build collectible tracking list
        this.collectibles = [];
        for (const pos of result.coinPositions) {
            this.collectibles.push({ col: pos.col, row: pos.row, type: 'coin', collected: false });
        }
        for (const pos of result.relicPositions) {
            this.collectibles.push({ col: pos.col, row: pos.row, type: 'relic', collected: false });
        }
        for (const pos of result.keyPositions) {
            this.collectibles.push({ col: pos.col, row: pos.row, type: 'key', collected: false });
        }

        // Win condition: collect ALL relics
        this.relicsRequired = result.relicPositions.length;
        this.relicsCollected = 0;
        this.coinsCollected = 0;

        // Timing
        this.timeElapsed = 0;
        this.levelStartTime = performance.now();
        this._animTimer = 0;

        gameEvents.emit('level:loaded', {
            level: levelNum,
            cols,
            rows,
            entrance: this.entrance,
            exit: this.exit,
            collectibles: this.collectibles.length,
            relicsRequired: this.relicsRequired,
        });
    }

    // ──────────────────────────────────────────────────────────
    //  Per-frame update
    // ──────────────────────────────────────────────────────────

    /**
     * Update level state each tick.
     * @param {number} dt - Fixed delta in ms
     */
    update(dt) {
        this.timeElapsed += dt;
        this._animTimer += dt;
    }

    // ──────────────────────────────────────────────────────────
    //  Collision / collection
    // ──────────────────────────────────────────────────────────

    /**
     * Check if the player is overlapping any collectible and process pickups.
     * @param {import('../entities/Player.js').default} player
     */
    checkCollisions(player) {
        const pCol = Math.floor(player.x);
        const pRow = Math.floor(player.y);

        for (let i = 0; i < this.collectibles.length; i++) {
            const item = this.collectibles[i];
            if (item.collected) continue;
            if (item.col !== pCol || item.row !== pRow) continue;

            // Collect!
            item.collected = true;

            // Clear cell type so the tile renderer stops drawing it
            if (this.grid && this.grid[item.row] && this.grid[item.row][item.col]) {
                this.grid[item.row][item.col].type = 'empty';
                this.grid[item.row][item.col].content = null;
            }

            switch (item.type) {
                case 'coin':
                    this.coinsCollected++;
                    player.totalCoinsCollected = (player.totalCoinsCollected || 0) + 1;
                    break;
                case 'relic':
                    this.relicsCollected++;
                    player.totalRelicsCollected = (player.totalRelicsCollected || 0) + 1;
                    break;
                case 'key':
                    // Key logic handled by future systems
                    break;
            }

            gameEvents.emit('item:collected', {
                type: item.type,
                col: item.col,
                row: item.row,
                coinsCollected: this.coinsCollected,
                relicsCollected: this.relicsCollected,
            });
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Win condition
    // ──────────────────────────────────────────────────────────

    /**
     * Check if the level has been completed:
     *   - All relics collected
     *   - Player standing on the exit cell
     * @param {import('../entities/Player.js').default} [player]
     * @returns {boolean}
     */
    isLevelComplete(player) {
        if (!player || !this.exit) return false;
        if (this.relicsCollected < this.relicsRequired) return false;

        const pCol = Math.floor(player.x);
        const pRow = Math.floor(player.y);
        return pCol === this.exit.col && pRow === this.exit.row;
    }

    // ──────────────────────────────────────────────────────────
    //  Enemy spawn planning
    // ──────────────────────────────────────────────────────────

    /**
     * Determine enemy types and spawn positions for a level.
     * @param {number} level
     * @param {import('./MazeCell.js').default[][]} grid
     * @returns {Array<{type: string, col: number, row: number, config: Object}>}
     */
    getEnemySpawns(level, grid) {
        const totalEnemies = Math.floor(LEVEL.BASE_ENEMIES + (level - 1) * LEVEL.ENEMIES_PER_LEVEL);
        const types = this._getEnemyTypesForLevel(level);
        const spawns = [];

        // Gather valid spawn cells (not entrance, not exit, not a collectible)
        const candidates = [];
        const rows = grid.length;
        const cols = grid[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (
                    cell.type === 'empty' &&
                    !(c === 0 && cell.type !== 'entrance') === false // don't place on col 0 row of entrance
                ) {
                    // Ensure some distance from entrance
                    const distFromEntrance = Math.abs(c) + Math.abs(r - Math.floor(rows / 2));
                    if (distFromEntrance > 3) {
                        candidates.push({ col: c, row: r });
                    }
                }
            }
        }

        shuffle(candidates);

        for (let i = 0; i < totalEnemies && i < candidates.length; i++) {
            const typeKey = types[i % types.length];
            const config = ENEMIES[typeKey];
            spawns.push({
                type: config.type,
                col: candidates[i].col,
                row: candidates[i].row,
                config,
            });
        }

        return spawns;
    }

    /**
     * Select which enemy type keys are available at a given level.
     * @param {number} level
     * @returns {string[]} Array of ENEMIES keys, e.g. ['SCOUT', 'HUNTER']
     * @private
     */
    _getEnemyTypesForLevel(level) {
        const types = ['SCOUT'];
        if (level >= 4) types.push('HUNTER');
        if (level >= 9) types.push('PHANTOM');
        if (level >= 16) types.push('SENTINEL');
        return types;
    }

    // ──────────────────────────────────────────────────────────
    //  Data accessors
    // ──────────────────────────────────────────────────────────

    /**
     * Return current level data snapshot.
     * @returns {{grid: MazeCell[][], cols: number, rows: number, entrance: Object, exit: Object}}
     */
    getLevelData() {
        return {
            grid: this.grid,
            cols: this.cols,
            rows: this.rows,
            entrance: this.entrance,
            exit: this.exit,
            collectibles: this.collectibles,
            relicsRequired: this.relicsRequired,
            relicsCollected: this.relicsCollected,
            coinsCollected: this.coinsCollected,
        };
    }
}
