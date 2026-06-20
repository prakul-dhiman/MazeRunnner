/**
 * MazeBreaker: Shadow Protocol — Player Controller
 * Translates input into player movement with wall-collision detection.
 * Allows smooth sub-tile movement while respecting maze walls.
 */

import { TILE_SIZE, PLAYER as P_CONST, KEYS } from '../constants.js';
import { clamp } from '../utils/MathUtils.js';
import { gameEvents } from '../utils/EventBus.js';

/**
 * Small inset (fraction of a tile) to prevent the player entity from
 * overlapping wall edges during diagonal movement.
 */
const COLLISION_MARGIN = 0.15;

export default class PlayerController {
    /**
     * @param {import('./Player.js').default} player
     * @param {import('../engine/InputManager.js').default} inputManager
     */
    constructor(player, inputManager) {
        /** @type {import('./Player.js').default} */
        this.player = player;

        /** @type {import('../engine/InputManager.js').default} */
        this.input = inputManager;
    }

    // ──────────────────────────────────────────────────────────
    //  Per-frame update
    // ──────────────────────────────────────────────────────────

    /**
     * Process input and move the player with maze-wall collision.
     * @param {number} dt  - Fixed timestep in ms
     * @param {import('../level/MazeCell.js').default[][]} grid - grid[row][col]
     * @param {number} cols
     * @param {number} rows
     */
    update(dt, grid, cols, rows) {
        if (!this.player.active) return;

        const dir = this.input.getDirection();

        // ── Sprint logic ──────────────────────────────────────
        const wantsSprint = this.input.isAnyKeyDown(KEYS.SPRINT);
        const moving = dir.x !== 0 || dir.y !== 0;
        const canSprint = this.player.stamina > 0 && moving;
        const sprinting = wantsSprint && canSprint;

        if (sprinting) {
            this.player.stamina = clamp(
                this.player.stamina - P_CONST.STAMINA_DRAIN * (dt / 16.667),
                0,
                this.player.maxStamina
            );
        } else {
            this.player.stamina = clamp(
                this.player.stamina + P_CONST.STAMINA_REGEN * (dt / 16.667),
                0,
                this.player.maxStamina
            );
        }

        this.player.isSprinting = sprinting;

        // ── Speed & displacement ──────────────────────────────
        const speed = sprinting ? this.player.speed * (P_CONST.SPRINT_SPEED / P_CONST.SPEED) : this.player.speed;
        const dtSec = dt / 1000;
        let dx = dir.x * speed * dtSec;
        let dy = dir.y * speed * dtSec;

        if (dx === 0 && dy === 0) {
            // No movement — still regenerate stamina, update noise
            this.player.noiseLevel = 0;
            this.player.moveDirection = { x: 0, y: 0 };
            return;
        }

        // ── Collision-resolved movement ───────────────────────
        // Process X and Y axes independently for wall sliding
        let newX = this.player.x + dx;
        let newY = this.player.y + dy;

        // Resolve X axis
        newX = this._resolveAxis(grid, this.player.x, this.player.y, newX, this.player.y, cols, rows, 'x');

        // Resolve Y axis (using already-resolved X)
        newY = this._resolveAxis(grid, newX, this.player.y, newX, newY, cols, rows, 'y');

        // Clamp to world boundaries
        newX = clamp(newX, COLLISION_MARGIN, cols - 1 + (1 - COLLISION_MARGIN));
        newY = clamp(newY, COLLISION_MARGIN, rows - 1 + (1 - COLLISION_MARGIN));

        // Apply
        this.player.x = newX;
        this.player.y = newY;
        this.player.px = newX * TILE_SIZE + TILE_SIZE / 2;
        this.player.py = newY * TILE_SIZE + TILE_SIZE / 2;

        // ── Facing angle ──────────────────────────────────────
        this.player.facingAngle = Math.atan2(dir.y, dir.x);
        this.player.moveDirection = { x: dir.x, y: dir.y };

        // ── Noise ─────────────────────────────────────────────
        this.player.noiseLevel = sprinting ? P_CONST.NOISE_SPRINT : P_CONST.NOISE_WALK;

        gameEvents.emit('player:moved', {
            x: this.player.x,
            y: this.player.y,
            col: Math.floor(this.player.x),
            row: Math.floor(this.player.y),
        });
    }

    // ──────────────────────────────────────────────────────────
    //  Axis-separated collision resolution
    // ──────────────────────────────────────────────────────────

    /**
     * Resolve movement along a single axis against maze walls.
     * @param {import('../level/MazeCell.js').default[][]} grid
     * @param {number} fromX - Current X
     * @param {number} fromY - Current Y
     * @param {number} toX   - Desired X
     * @param {number} toY   - Desired Y
     * @param {number} cols
     * @param {number} rows
     * @param {'x' | 'y'} axis
     * @returns {number} Resolved value for the axis
     * @private
     */
    _resolveAxis(grid, fromX, fromY, toX, toY, cols, rows, axis) {
        if (axis === 'x') {
            const curCol = Math.floor(fromX);
            const curRow = Math.floor(fromY);
            const newCol = Math.floor(toX);

            // Moving right
            if (newCol > curCol) {
                if (!this._canMove(grid, curCol, curRow, 'right', cols, rows)) {
                    return curCol + 1 - COLLISION_MARGIN;
                }
            }
            // Moving left
            else if (newCol < curCol) {
                if (!this._canMove(grid, curCol, curRow, 'left', cols, rows)) {
                    return curCol + COLLISION_MARGIN;
                }
            }
            return toX;
        }

        // axis === 'y'
        const curCol = Math.floor(toX); // use resolved X
        const curRow = Math.floor(fromY);
        const newRow = Math.floor(toY);

        // Moving down
        if (newRow > curRow) {
            if (!this._canMove(grid, curCol, curRow, 'bottom', cols, rows)) {
                return curRow + 1 - COLLISION_MARGIN;
            }
        }
        // Moving up
        else if (newRow < curRow) {
            if (!this._canMove(grid, curCol, curRow, 'top', cols, rows)) {
                return curRow + COLLISION_MARGIN;
            }
        }
        return toY;
    }

    // ──────────────────────────────────────────────────────────
    //  Wall query
    // ──────────────────────────────────────────────────────────

    /**
     * Check whether movement from a cell in a given direction is blocked by a wall.
     * @param {import('../level/MazeCell.js').default[][]} grid - grid[row][col]
     * @param {number} col
     * @param {number} row
     * @param {'top' | 'right' | 'bottom' | 'left'} direction
     * @param {number} cols
     * @param {number} rows
     * @returns {boolean} true if the path is open (no wall), false if blocked
     */
    _canMove(grid, col, row, direction, cols, rows) {
        // Bounds check
        if (col < 0 || col >= cols || row < 0 || row >= rows) return false;

        const cell = grid[row][col];
        if (!cell) return false;

        // If there's a wall on this side, movement is blocked
        return !cell.hasWall(direction);
    }
}
