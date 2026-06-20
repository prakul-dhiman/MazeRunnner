/**
 * MazeBreaker: Shadow Protocol — Scout Unit
 * Fast, nimble enemy with limited vision range.
 * Leaves a speed trail effect when moving.
 */

import Enemy from './Enemy.js';
import { ENEMIES, TILE_SIZE } from '../../constants.js';

/** Number of trail positions to retain. */
const TRAIL_LENGTH = 6;
/** How often (frames) a new trail point is stored. */
const TRAIL_SAMPLE_INTERVAL = 3;

export default class ScoutUnit extends Enemy {
    /**
     * @param {number} col - Spawn grid column
     * @param {number} row - Spawn grid row
     * @param {Array<Array>} grid - The maze grid
     */
    constructor(col, row, grid) {
        super(col, row, ENEMIES.SCOUT, grid);

        // Smaller body for nimble appearance
        this.width = TILE_SIZE * 0.5;
        this.height = TILE_SIZE * 0.5;

        // Speed trail history
        /** @type {Array<{x:number,y:number}>} */
        this._trail = [];
        /** @type {number} */
        this._trailFrame = 0;
    }

    /**
     * Update the scout: run base AI + record trail positions.
     * @param {number} dt
     * @param {{ col: number, row: number }} [playerPos]
     */
    update(dt, playerPos) {
        super.update(dt, playerPos);

        // Sample trail position every few frames
        this._trailFrame++;
        if (this._trailFrame >= TRAIL_SAMPLE_INTERVAL) {
            this._trailFrame = 0;
            this._trail.push({ x: this.px, y: this.py });
            if (this._trail.length > TRAIL_LENGTH) {
                this._trail.shift();
            }
        }
    }

    /**
     * Render scout with speed trail effect.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x:number,y:number)=>{x:number,y:number} }} camera
     */
    render(ctx, camera) {
        if (!this.active) return;

        // ── Speed trail ──
        for (let i = 0; i < this._trail.length; i++) {
            const t = this._trail[i];
            const screen = camera.worldToScreen(t.x, t.y);
            const alpha = ((i + 1) / this._trail.length) * 0.25;
            const trailR = (this.width / 2) * ((i + 1) / this._trail.length) * 0.7;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, trailR, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        // ── Base render (body, cone, indicators) ──
        super.render(ctx, camera);

        // ── Inner highlight for nimble appearance ──
        const screen = camera.worldToScreen(this.px, this.py);
        const r = this.width / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#777' : '#ffaa44';
        ctx.globalAlpha = this.disabled ? 0.3 : 0.6;
        ctx.fill();
        ctx.restore();
    }
}
