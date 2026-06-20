/**
 * MazeBreaker: Shadow Protocol — Sentinel Unit
 * Stationary alarm tower with 360° vision that alerts nearby enemies
 * when the player is detected. Does not move, chase, or attack directly.
 */

import Enemy from './Enemy.js';
import { ENEMIES, TILE_SIZE, AI_STATES } from '../../constants.js';
import { gameEvents } from '../../utils/EventBus.js';

/** Rotation speed of the scan beam in radians/second. */
const SCAN_ROTATION_SPEED = 1.2;
/** Minimum interval (ms) between alert emissions to avoid spam. */
const ALERT_COOLDOWN = 3000;

export default class SentinelUnit extends Enemy {
    /**
     * @param {number} col - Spawn grid column
     * @param {number} row - Spawn grid row
     * @param {Array<Array>} grid - The maze grid
     */
    constructor(col, row, grid) {
        super(col, row, ENEMIES.SENTINEL, grid);

        // Sentinel is slightly larger — tower/turret visual
        this.width = TILE_SIZE * 0.7;
        this.height = TILE_SIZE * 0.7;

        // Force speed to 0 so FSM movement does nothing
        this.speed = 0;

        // Pulsing glow phase
        /** @type {number} */
        this._pulsePhase = 0;

        // Alert cooldown
        /** @type {number} */
        this._alertCooldown = 0;

        // Scan beam angle (rotates continuously)
        /** @type {number} */
        this._scanAngle = 0;
    }

    /**
     * Override update: never move, only rotate vision and detect player.
     * @param {number} dt
     * @param {{ col: number, row: number }} [playerPos]
     */
    update(dt, playerPos) {
        if (!this.active) return;

        // Handle EMP disable
        if (this.disabled) {
            this.disabledTimer -= dt;
            if (this.disabledTimer <= 0) {
                this.disabled = false;
                this.disabledTimer = 0;
            }
            return;
        }

        // Rotate scan beam
        this._scanAngle += SCAN_ROTATION_SPEED * (dt / 1000);
        if (this._scanAngle > Math.PI * 2) this._scanAngle -= Math.PI * 2;
        this.facingAngle = this._scanAngle;

        // Pulse glow
        this._pulsePhase += dt * 0.003;
        if (this._pulsePhase > Math.PI * 2) this._pulsePhase -= Math.PI * 2;

        // Alert cooldown
        if (this._alertCooldown > 0) {
            this._alertCooldown -= dt;
        }

        // Detect player (360° vision — always in cone)
        if (this.playerRef) {
            const playerPos = { col: this.playerRef.x, row: this.playerRef.y };
            if (this.canSeeTarget(playerPos, this.grid)) {
                this.alertLevel = 1.0;

                // Emit alert event on cooldown
                if (this._alertCooldown <= 0) {
                    this._alertCooldown = ALERT_COOLDOWN;
                    gameEvents.emit('sentinel:alert', {
                        col: this.spawnCol,
                        row: this.spawnRow,
                        playerCol: Math.round(playerPos.col),
                        playerRow: Math.round(playerPos.row),
                        alertRadius: this.config.alertRadius || 10,
                    });
                }
            } else {
                // Slowly decay alert
                this.alertLevel = Math.max(0, this.alertLevel - 0.2 * (dt / 1000));
            }
        }

        // Keep position locked to spawn (never move)
        this.x = this.spawnCol;
        this.y = this.spawnRow;

        // Sync pixel position
        const { gridToPixel } = await_import_workaround;
        this.px = this.spawnCol * TILE_SIZE + TILE_SIZE / 2;
        this.py = this.spawnRow * TILE_SIZE + TILE_SIZE / 2;
    }

    /**
     * Render sentinel as a tower/turret with rotating scan beam and pulsing glow.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x:number,y:number)=>{x:number,y:number} }} camera
     */
    render(ctx, camera) {
        if (!this.active) return;

        const screen = camera.worldToScreen(this.px, this.py);
        const r = this.width / 2;
        const pulse = 0.6 + Math.sin(this._pulsePhase) * 0.4;

        // ── Pulsing yellow glow ──
        if (!this.disabled) {
            ctx.save();
            const glowR = r * (2.0 + pulse * 0.8);
            const gradient = ctx.createRadialGradient(
                screen.x, screen.y, r * 0.3,
                screen.x, screen.y, glowR
            );
            gradient.addColorStop(0, `rgba(255, 230, 0, ${0.15 * pulse})`);
            gradient.addColorStop(0.6, 'rgba(255, 230, 0, 0.04)');
            gradient.addColorStop(1, 'rgba(255, 230, 0, 0)');
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        }

        // ── Rotating scan beam ──
        if (!this.disabled) {
            const beamLen = this.visionRange * TILE_SIZE;
            const beamWidth = 0.15; // radians

            ctx.save();
            ctx.globalAlpha = 0.15 + this.alertLevel * 0.15;
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.arc(screen.x, screen.y, beamLen, this._scanAngle - beamWidth, this._scanAngle + beamWidth);
            ctx.closePath();
            ctx.fillStyle = this.alertLevel > 0.5 ? '#ff073a' : '#ffe600';
            ctx.fill();
            ctx.restore();
        }

        // ── Tower base (octagon-ish) ──
        ctx.save();
        ctx.shadowColor = this.disabled ? '#555' : this.color;
        ctx.shadowBlur = this.disabled ? 2 : 10;
        ctx.beginPath();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / sides;
            const px = screen.x + Math.cos(angle) * r;
            const py = screen.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = this.disabled ? '#555' : this.color;
        ctx.globalAlpha = this.disabled ? 0.4 : 0.9;
        ctx.fill();
        ctx.strokeStyle = this.disabled ? '#777' : '#fff8aa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // ── Inner eye ──
        ctx.save();
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#444' : (this.alertLevel > 0.5 ? '#ff073a' : '#ffffff');
        ctx.fill();
        ctx.restore();

        // ── Alert "!" ──
        if (this.alertLevel > 0.5 && !this.disabled) {
            ctx.save();
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff073a';
            ctx.fillText('⚠', screen.x, screen.y - r - 8);
            ctx.restore();
        }
    }
}

// Inline pixel sync (avoid async import) — used in update
const await_import_workaround = null;
