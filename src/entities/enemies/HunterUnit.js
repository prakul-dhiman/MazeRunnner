/**
 * MazeBreaker: Shadow Protocol — Hunter Unit
 * Aggressive pursuer with frequent path recalculation
 * and a menacing red glow.
 */

import Enemy from './Enemy.js';
import { ENEMIES, TILE_SIZE, AI_STATES } from '../../constants.js';

/** Alert escalation rate per second (faster than base). */
const ALERT_ESCALATION = 0.5;

export default class HunterUnit extends Enemy {
    /**
     * @param {number} col - Spawn grid column
     * @param {number} row - Spawn grid row
     * @param {Array<Array>} grid - The maze grid
     */
    constructor(col, row, grid) {
        super(col, row, ENEMIES.HUNTER, grid);

        // Larger, bulkier body
        this.width = TILE_SIZE * 0.75;
        this.height = TILE_SIZE * 0.75;

        // Pulsing glow state
        /** @type {number} */
        this._glowPhase = 0;
    }

    /**
     * Update hunter AI with more aggressive alert escalation.
     * @param {number} dt
     * @param {{ col: number, row: number }} [playerPos]
     */
    update(dt, playerPos) {
        super.update(dt, playerPos);

        // Pulse glow
        this._glowPhase += dt * 0.004;
        if (this._glowPhase > Math.PI * 2) this._glowPhase -= Math.PI * 2;

        // Escalate alert faster when player is in range
        if (!this.disabled && this.playerRef) {
            const dist = this.distanceTo(this.playerRef);
            if (dist < this.visionRange * 1.5) {
                this.alertLevel = Math.min(1, this.alertLevel + ALERT_ESCALATION * (dt / 1000));
            }
        }
    }

    /**
     * Render hunter with menacing red glow and larger body.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x:number,y:number)=>{x:number,y:number} }} camera
     */
    render(ctx, camera) {
        if (!this.active) return;

        const screen = camera.worldToScreen(this.px, this.py);
        const r = this.width / 2;

        // ── Outer menacing glow (pulsing) ──
        if (!this.disabled) {
            const pulse = 0.6 + Math.sin(this._glowPhase) * 0.4;
            const glowRadius = r * (1.8 + pulse * 0.6);

            ctx.save();
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, r * 0.5,
                screen.x, screen.y, glowRadius
            );
            gradient.addColorStop(0, 'rgba(255, 7, 58, 0.25)');
            gradient.addColorStop(0.6, 'rgba(255, 7, 58, 0.08)');
            gradient.addColorStop(1, 'rgba(255, 7, 58, 0)');
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        }

        // ── Base render ──
        super.render(ctx, camera);

        // ── Inner eye / menace core ──
        ctx.save();
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#555' : '#ff2244';
        ctx.globalAlpha = this.disabled ? 0.3 : 0.8;
        ctx.fill();
        ctx.restore();

        // ── Cross-hair marks (hostile indicator) ──
        if (!this.disabled && this.alertLevel > 0.3) {
            ctx.save();
            ctx.strokeStyle = '#ff073a';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = this.alertLevel * 0.7;
            const len = r * 0.5;
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(screen.x - r - len, screen.y);
            ctx.lineTo(screen.x - r + 2, screen.y);
            ctx.moveTo(screen.x + r - 2, screen.y);
            ctx.lineTo(screen.x + r + len, screen.y);
            // Vertical
            ctx.moveTo(screen.x, screen.y - r - len);
            ctx.lineTo(screen.x, screen.y - r + 2);
            ctx.moveTo(screen.x, screen.y + r - 2);
            ctx.lineTo(screen.x, screen.y + r + len);
            ctx.stroke();
            ctx.restore();
        }
    }
}
