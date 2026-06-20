/**
 * MazeBreaker: Shadow Protocol — Tile Renderer
 * Draws the maze grid (floors, walls, collectibles) onto the background
 * canvas with a cyber-neon aesthetic using glow effects.
 */

import { TILE_SIZE, COLORS } from '../constants.js';

/** Wall line width in pixels */
const WALL_WIDTH = 3;

/** Glow blur radius for neon wall edges */
const WALL_GLOW_BLUR = 8;

/** Glow blur radius for entrance/exit portals */
const PORTAL_GLOW_BLUR = 14;

export default class TileRenderer {
    /**
     * @param {import('../engine/Renderer.js').default} renderer
     */
    constructor(renderer) {
        /** @type {import('../engine/Renderer.js').default} */
        this._renderer = renderer;

        /** Animation clock (ms) for pulsing effects */
        this._time = 0;
    }

    /**
     * Render the entire maze to the background canvas.
     * Only draws cells visible to the camera.
     * @param {import('./MazeCell.js').default[][]} grid - grid[row][col]
     * @param {number} cols
     * @param {number} rows
     * @param {import('../engine/Camera.js').default} camera
     */
    renderMaze(grid, cols, rows, camera) {
        const ctx = this._renderer.bg;
        if (!ctx) return;

        this._time += 16.667; // approximate per-frame increment

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const wx = c * TILE_SIZE + TILE_SIZE / 2;
                const wy = r * TILE_SIZE + TILE_SIZE / 2;

                // Frustum cull
                if (!camera.isVisible(wx, wy, TILE_SIZE * 2)) continue;

                const cell = grid[r][c];
                const screen = camera.worldToScreen(c * TILE_SIZE, r * TILE_SIZE);

                this._drawFloor(ctx, screen.x, screen.y, cell);
                this._drawWalls(ctx, screen.x, screen.y, cell);
                this._drawCellOverlay(ctx, screen.x, screen.y, cell);
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Floor
    // ──────────────────────────────────────────────────────────

    /**
     * Draw the floor tile with a subtle grid pattern.
     * @private
     */
    _drawFloor(ctx, sx, sy, cell) {
        // Base dark floor
        ctx.fillStyle = COLORS.FLOOR_PRIMARY;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

        // Subtle grid pattern (alternating slight shade)
        if ((cell.col + cell.row) % 2 === 0) {
            ctx.fillStyle = COLORS.FLOOR_PATTERN;
            ctx.fillRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Walls
    // ──────────────────────────────────────────────────────────

    /**
     * Draw neon-edged walls with glow.
     * @private
     */
    _drawWalls(ctx, sx, sy, cell) {
        ctx.save();
        ctx.lineWidth = WALL_WIDTH;
        ctx.lineCap = 'round';
        ctx.strokeStyle = COLORS.WALL_EDGE;
        ctx.shadowColor = COLORS.WALL_GLOW;
        ctx.shadowBlur = WALL_GLOW_BLUR;

        const x0 = sx;
        const y0 = sy;
        const x1 = sx + TILE_SIZE;
        const y1 = sy + TILE_SIZE;

        if (cell.hasWall('top')) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y0);
            ctx.stroke();
        }
        if (cell.hasWall('right')) {
            ctx.beginPath();
            ctx.moveTo(x1, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
        if (cell.hasWall('bottom')) {
            ctx.beginPath();
            ctx.moveTo(x0, y1);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
        if (cell.hasWall('left')) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0, y1);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────
    //  Cell overlay (entrance, exit, collectibles)
    // ──────────────────────────────────────────────────────────

    /**
     * Draw special cell indicators (entrance portal, exit portal, collectibles).
     * @private
     */
    _drawCellOverlay(ctx, sx, sy, cell) {
        const cx = sx + TILE_SIZE / 2;
        const cy = sy + TILE_SIZE / 2;

        switch (cell.type) {
            case 'entrance':
                this._drawPortal(ctx, cx, cy, COLORS.NEON_GREEN, 0.6);
                break;
            case 'exit':
                this._drawPortal(ctx, cx, cy, COLORS.NEON_CYAN, this._pulse(0.4, 1.0, 2000));
                break;
            case 'coin':
                this._renderCollectible(ctx, 'coin', cx, cy);
                break;
            case 'relic':
                this._renderCollectible(ctx, 'relic', cx, cy);
                break;
            case 'key':
                this._renderCollectible(ctx, 'key', cx, cy);
                break;
        }
    }

    /**
     * Draw a glowing portal circle.
     * @private
     */
    _drawPortal(ctx, cx, cy, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = PORTAL_GLOW_BLUR;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────
    //  Collectible rendering
    // ──────────────────────────────────────────────────────────

    /**
     * Render an animated collectible icon at the given screen position.
     * @param {CanvasRenderingContext2D} ctx
     * @param {'coin' | 'relic' | 'key'} type
     * @param {number} cx - Screen center X
     * @param {number} cy - Screen center Y
     */
    _renderCollectible(ctx, type, cx, cy) {
        ctx.save();

        // Subtle float animation
        const floatY = Math.sin(this._time / 400 + cx) * 2;
        const y = cy + floatY;

        switch (type) {
            case 'coin':
                this._drawCoin(ctx, cx, y);
                break;
            case 'relic':
                this._drawRelic(ctx, cx, y);
                break;
            case 'key':
                this._drawKey(ctx, cx, y);
                break;
        }

        ctx.restore();
    }

    /**
     * Draw a golden coin with a sparkle.
     * @private
     */
    _drawCoin(ctx, cx, cy) {
        const r = 5;
        const sparkle = this._pulse(0.6, 1.0, 800);

        ctx.shadowColor = COLORS.COIN;
        ctx.shadowBlur = 6 * sparkle;
        ctx.fillStyle = COLORS.COIN;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw a pulsing magenta diamond.
     * @private
     */
    _drawRelic(ctx, cx, cy) {
        const size = 7;
        const pulse = this._pulse(0.7, 1.0, 1200);

        ctx.shadowColor = COLORS.RELIC;
        ctx.shadowBlur = 10 * pulse;
        ctx.fillStyle = COLORS.RELIC;

        ctx.beginPath();
        ctx.moveTo(cx, cy - size);         // top
        ctx.lineTo(cx + size * 0.6, cy);   // right
        ctx.lineTo(cx, cy + size);         // bottom
        ctx.lineTo(cx - size * 0.6, cy);   // left
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Draw a green key shape.
     * @private
     */
    _drawKey(ctx, cx, cy) {
        ctx.shadowColor = COLORS.KEY;
        ctx.shadowBlur = 8;
        ctx.fillStyle = COLORS.KEY;
        ctx.strokeStyle = COLORS.KEY;
        ctx.lineWidth = 2;

        // Key head (circle)
        ctx.beginPath();
        ctx.arc(cx, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Key shaft
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + 6);
        ctx.stroke();

        // Key teeth
        ctx.beginPath();
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx + 3, cy + 4);
        ctx.stroke();
    }

    // ──────────────────────────────────────────────────────────
    //  Utility
    // ──────────────────────────────────────────────────────────

    /**
     * Generate a pulsing value between min and max over a period.
     * @param {number} min
     * @param {number} max
     * @param {number} period - Pulse period in ms
     * @returns {number}
     * @private
     */
    _pulse(min, max, period) {
        const t = (Math.sin((this._time / period) * Math.PI * 2) + 1) / 2;
        return min + t * (max - min);
    }
}
