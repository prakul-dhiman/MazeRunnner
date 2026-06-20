/**
 * MazeBreaker: Shadow Protocol — Phantom Unit
 * Ethereal enemy that can phase through walls.
 * Semi-transparent with a floating animation and purple glow.
 */

import Enemy from './Enemy.js';
import { ENEMIES, TILE_SIZE, AI_STATES } from '../../constants.js';
import { gameEvents } from '../../utils/EventBus.js';

export default class PhantomUnit extends Enemy {
    /**
     * @param {number} col - Spawn grid column
     * @param {number} row - Spawn grid row
     * @param {Array<Array>} grid - The maze grid
     */
    constructor(col, row, grid) {
        super(col, row, ENEMIES.PHANTOM, grid);

        // Slightly smaller ethereal body
        this.width = TILE_SIZE * 0.6;
        this.height = TILE_SIZE * 0.6;

        // Float animation phase
        /** @type {number} */
        this._floatPhase = Math.random() * Math.PI * 2;
        /** @type {number} Float amplitude in pixels */
        this._floatAmplitude = 3;

        // Track wall-phasing for visual effect
        /** @type {boolean} */
        this._isPhasing = false;
        /** @type {number} Phase visual timer */
        this._phaseEffectTimer = 0;
    }

    /**
     * Update phantom with float animation and wall-phase detection.
     * @param {number} dt
     * @param {{ col: number, row: number }} [playerPos]
     */
    update(dt, playerPos) {
        const prevCol = Math.round(this.x);
        const prevRow = Math.round(this.y);

        super.update(dt, playerPos);

        // Float animation
        this._floatPhase += dt * 0.003;
        if (this._floatPhase > Math.PI * 2) this._floatPhase -= Math.PI * 2;

        // Detect wall phasing (grid cell changed while walls exist between)
        const newCol = Math.round(this.x);
        const newRow = Math.round(this.y);
        if ((newCol !== prevCol || newRow !== prevRow) && this._checkPhased(prevCol, prevRow, newCol, newRow)) {
            this._isPhasing = true;
            this._phaseEffectTimer = 400; // ms of phase visual
        }

        if (this._phaseEffectTimer > 0) {
            this._phaseEffectTimer -= dt;
            if (this._phaseEffectTimer <= 0) {
                this._isPhasing = false;
                this._phaseEffectTimer = 0;
            }
        }
    }

    /**
     * Override path requests to always use canPhaseWalls=true during chase.
     * @param {{ col: number, row: number }} goal
     */
    _requestPathTo(goal) {
        const start = {
            col: Math.round(this.x),
            row: Math.round(this.y),
        };
        const inChase = this.fsm.isInState(AI_STATES.CHASE) || this.fsm.isInState(AI_STATES.ATTACK);
        const pathfinder = Enemy.getPathfinder();
        const path = pathfinder.findPath(this.grid, start, goal, inChase);
        this.setPath(path);
    }

    /**
     * Render phantom with ethereal, semi-transparent appearance.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x:number,y:number)=>{x:number,y:number} }} camera
     */
    render(ctx, camera) {
        if (!this.active) return;

        const floatOffset = Math.sin(this._floatPhase) * this._floatAmplitude;
        const screen = camera.worldToScreen(this.px, this.py + floatOffset);
        const r = this.width / 2;

        // ── Ethereal glow ──
        if (!this.disabled) {
            ctx.save();
            const glowR = r * 2.2;
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, r * 0.3,
                screen.x, screen.y, glowR
            );
            gradient.addColorStop(0, 'rgba(191, 0, 255, 0.2)');
            gradient.addColorStop(0.5, 'rgba(191, 0, 255, 0.06)');
            gradient.addColorStop(1, 'rgba(191, 0, 255, 0)');
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        }

        // ── Vision cone (drawn with base offset) ──
        if (!this.disabled) {
            this._renderVisionCone(ctx, screen, r);
        }

        // ── Semi-transparent body ──
        ctx.save();
        ctx.globalAlpha = this.disabled ? 0.2 : 0.55;
        ctx.shadowColor = this.disabled ? '#555' : '#bf00ff';
        ctx.shadowBlur = this.disabled ? 2 : 16;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#777' : this.color;
        ctx.fill();
        ctx.restore();

        // ── Inner spectral core ──
        ctx.save();
        ctx.globalAlpha = this.disabled ? 0.15 : 0.7;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#e0aaff';
        ctx.fill();
        ctx.restore();

        // ── Phase effect (distortion ring when passing through walls) ──
        if (this._isPhasing && !this.disabled) {
            const progress = 1 - (this._phaseEffectTimer / 400);
            const ringR = r * (1 + progress * 2.5);
            ctx.save();
            ctx.globalAlpha = (1 - progress) * 0.6;
            ctx.strokeStyle = '#bf00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, ringR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ── Alert indicator ──
        if (this.alertLevel > 0.5 && !this.disabled) {
            ctx.save();
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.getAlertColor();
            ctx.fillText('!', screen.x, screen.y - r - 6);
            ctx.restore();
        }

        // ── State dot ──
        const stateName = this.fsm.getCurrentStateName();
        const STATE_COLORS = {
            [AI_STATES.PATROL]: '#39ff14',
            [AI_STATES.INVESTIGATE]: '#ffe600',
            [AI_STATES.SEARCH]: '#ff6a00',
            [AI_STATES.CHASE]: '#ff073a',
            [AI_STATES.ATTACK]: '#ff0000',
            [AI_STATES.RETURN]: '#00f0ff',
        };
        ctx.beginPath();
        ctx.arc(screen.x + r + 3, screen.y - r - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = STATE_COLORS[stateName] || '#ffffff';
        ctx.fill();
    }

    /**
     * Check if a move between two cells crossed a wall.
     * @param {number} fromCol
     * @param {number} fromRow
     * @param {number} toCol
     * @param {number} toRow
     * @returns {boolean}
     */
    _checkPhased(fromCol, fromRow, toCol, toRow) {
        const grid = this.grid;
        if (!grid[fromRow] || !grid[fromRow][fromCol]) return false;

        const cell = grid[fromRow][fromCol];
        const dc = toCol - fromCol;
        const dr = toRow - fromRow;

        if (dc === 1 && cell.walls.right) return true;
        if (dc === -1 && cell.walls.left) return true;
        if (dr === 1 && cell.walls.bottom) return true;
        if (dr === -1 && cell.walls.top) return true;

        return false;
    }
}
