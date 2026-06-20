/**
 * MazeBreaker: Shadow Protocol — Fog of War
 * Three-state tile visibility system: HIDDEN → EXPLORED → VISIBLE.
 * Uses BFS flood fill from the player position with wall occlusion.
 * Renders a smooth radial gradient overlay on the fog canvas layer.
 */

import { TILE_SIZE, COLORS } from '../constants.js';

/** Visibility states stored in the grid */
const FOG_HIDDEN = 0;
const FOG_EXPLORED = 1;
const FOG_VISIBLE = 2;

export default class FogOfWar {
    /**
     * @param {Object} renderer - Renderer providing canvas contexts
     */
    constructor(renderer) {
        /** @type {CanvasRenderingContext2D|null} */
        this._ctx = renderer?.fog ?? renderer?.getFogContext?.() ?? renderer?.fogCtx ?? null;

        /** @type {Uint8Array|null} */
        this._grid = null;

        /** @type {number} */
        this._cols = 0;

        /** @type {number} */
        this._rows = 0;

        /** @type {number} Total explorable cells (non-wall) */
        this._explorableCells = 0;

        /** @type {number} Count of explored cells */
        this._exploredCount = 0;
    }

    /**
     * Initialize the visibility grid for a new level.
     * @param {number} cols - Maze width in tiles
     * @param {number} rows - Maze height in tiles
     */
    init(cols, rows) {
        this._cols = cols;
        this._rows = rows;
        this._grid = new Uint8Array(cols * rows);
        this._explorableCells = cols * rows;
        this._exploredCount = 0;
    }

    /**
     * Update visibility around the player using BFS flood fill.
     * @param {number} playerCol - Player grid column
     * @param {number} playerRow - Player grid row
     * @param {number} visionRadius - Vision radius in tiles
     * @param {Array[]} mazeGrid - Maze grid for wall checks
     */
    update(playerCol, playerRow, visionRadius, mazeGrid) {
        if (!this._grid) return;

        // Demote all VISIBLE cells to EXPLORED
        for (let i = 0; i < this._grid.length; i++) {
            if (this._grid[i] === FOG_VISIBLE) {
                this._grid[i] = FOG_EXPLORED;
            }
        }

        // BFS flood fill from player position
        const radiusSq = visionRadius * visionRadius;
        const visited = new Set();
        const queue = [{ col: playerCol, row: playerRow }];
        const startKey = playerRow * this._cols + playerCol;
        visited.add(startKey);

        while (queue.length > 0) {
            const { col, row } = queue.shift();

            // Distance check (circular radius)
            const dx = col - playerCol;
            const dy = row - playerRow;
            if (dx * dx + dy * dy > radiusSq) continue;

            // Mark cell as visible
            if (col >= 0 && col < this._cols && row >= 0 && row < this._rows) {
                const idx = row * this._cols + col;
                const wasHidden = this._grid[idx] === FOG_HIDDEN;
                this._grid[idx] = FOG_VISIBLE;
                if (wasHidden) this._exploredCount++;
            }

            // Check if this cell is a wall — don't expand past walls
            if (this._isWall(col, row, mazeGrid) && !(col === playerCol && row === playerRow)) {
                continue;
            }

            // Expand to 4 cardinal neighbors
            const neighbors = [
                { col: col - 1, row },
                { col: col + 1, row },
                { col, row: row - 1 },
                { col, row: row + 1 },
            ];

            for (const n of neighbors) {
                if (n.col < 0 || n.col >= this._cols || n.row < 0 || n.row >= this._rows) continue;
                const key = n.row * this._cols + n.col;
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push(n);
            }
        }
    }

    /**
     * Render the fog overlay on the fog canvas.
     * @param {Object} camera - Camera with x, y and optional worldToScreen
     */
    render(camera) {
        if (!this._ctx || !this._grid) return;

        const ctx = this._ctx;
        const canvas = ctx.canvas;
        const cw = canvas.width;
        const ch = canvas.height;

        ctx.save();

        // Clear the fog canvas
        ctx.clearRect(0, 0, cw, ch);

        // Fill entire canvas with dense fog
        ctx.fillStyle = COLORS.FOG_HIDDEN;
        ctx.fillRect(0, 0, cw, ch);

        // Apply camera transform
        const camX = camera.x ?? 0;
        const camY = camera.y ?? 0;

        // Lighten explored cells
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                const state = this._grid[row * this._cols + col];
                if (state === FOG_EXPLORED) {
                    const sx = col * TILE_SIZE - camX;
                    const sy = row * TILE_SIZE - camY;

                    // Skip if off-screen
                    if (sx + TILE_SIZE < 0 || sx > cw || sy + TILE_SIZE < 0 || sy > ch) continue;

                    // Clear the dense fog and replace with lighter fog
                    ctx.clearRect(sx, sy, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = COLORS.FOG_EXPLORED;
                    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Cut out visible area using destination-out with radial gradient
        ctx.globalCompositeOperation = 'destination-out';

        // Find player screen position (center of their visible tile cluster)
        let playerScreenX = 0;
        let playerScreenY = 0;
        let visibleCount = 0;

        // Find center of visible area for gradient placement
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                if (this._grid[row * this._cols + col] === FOG_VISIBLE) {
                    playerScreenX += col;
                    playerScreenY += row;
                    visibleCount++;
                }
            }
        }

        if (visibleCount > 0) {
            // Use first visible cell cluster center
            playerScreenX = (playerScreenX / visibleCount) * TILE_SIZE + TILE_SIZE / 2 - camX;
            playerScreenY = (playerScreenY / visibleCount) * TILE_SIZE + TILE_SIZE / 2 - camY;

            // Estimate vision radius in pixels
            const radiusPx = Math.sqrt(visibleCount) * TILE_SIZE * 0.7;

            const gradient = ctx.createRadialGradient(
                playerScreenX, playerScreenY, 0,
                playerScreenX, playerScreenY, radiusPx
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(
                playerScreenX - radiusPx,
                playerScreenY - radiusPx,
                radiusPx * 2,
                radiusPx * 2
            );
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    /**
     * Check if a maze cell is a wall.
     * @param {number} col
     * @param {number} row
     * @param {Array[]} mazeGrid
     * @returns {boolean}
     */
    _isWall(col, row, mazeGrid) {
        if (!mazeGrid || row < 0 || row >= mazeGrid.length) return true;
        if (col < 0 || col >= (mazeGrid[0]?.length ?? 0)) return true;
        const cell = mazeGrid[row][col];
        return cell === 1 || cell?.wall === true || cell?.isWall === true;
    }

    /**
     * Get the fraction of explorable cells that have been explored.
     * @returns {number} Percentage in [0, 1]
     */
    getExplorationPercentage() {
        if (this._explorableCells === 0) return 0;
        return this._exploredCount / this._explorableCells;
    }

    /**
     * Check if a cell is currently VISIBLE.
     * @param {number} col
     * @param {number} row
     * @returns {boolean}
     */
    isCellVisible(col, row) {
        if (!this._grid || col < 0 || col >= this._cols || row < 0 || row >= this._rows) {
            return false;
        }
        return this._grid[row * this._cols + col] === FOG_VISIBLE;
    }

    /**
     * Check if a cell is EXPLORED or VISIBLE.
     * @param {number} col
     * @param {number} row
     * @returns {boolean}
     */
    isCellExplored(col, row) {
        if (!this._grid || col < 0 || col >= this._cols || row < 0 || row >= this._rows) {
            return false;
        }
        const state = this._grid[row * this._cols + col];
        return state === FOG_EXPLORED || state === FOG_VISIBLE;
    }
}
