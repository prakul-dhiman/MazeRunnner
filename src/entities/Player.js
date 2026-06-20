/**
 * MazeBreaker: Shadow Protocol — Player
 * Player entity with health, stamina, stealth state, and
 * a cyber-neon visual style. Movement is handled by PlayerController.
 */

import { TILE_SIZE, PLAYER as P_CONST, COLORS } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';
import { clamp } from '../utils/MathUtils.js';
import Entity from './Entity.js';

export default class Player extends Entity {
    /**
     * @param {number} col - Starting grid column
     * @param {number} row - Starting grid row
     */
    constructor(col, row) {
        super(col, row, P_CONST.SIZE * TILE_SIZE, P_CONST.SIZE * TILE_SIZE);

        this.speed = P_CONST.SPEED;
        this.baseSpeed = P_CONST.SPEED;
        this.color = COLORS.PLAYER;

        // ── Health ─────────────────────────────────────────────
        /** @type {number} */
        this.hp = P_CONST.MAX_HP;
        /** @type {number} */
        this.maxHp = P_CONST.MAX_HP;
        this.baseMaxHp = P_CONST.MAX_HP;

        // ── Stamina ────────────────────────────────────────────
        /** @type {number} */
        this.stamina = P_CONST.MAX_STAMINA;
        /** @type {number} */
        this.maxStamina = P_CONST.MAX_STAMINA;
        this.baseMaxStamina = P_CONST.MAX_STAMINA;
        this.baseStaminaRegen = P_CONST.STAMINA_REGEN;
        this.baseVisionRadius = P_CONST.VISIBILITY_RADIUS;
        this.visionRadius = P_CONST.VISIBILITY_RADIUS;

        // ── Movement / stealth state ──────────────────────────
        /** @type {boolean} Currently sprinting */
        this.isSprinting = false;

        /** @type {boolean} Visible to enemies (false = cloaked) */
        this.isVisible = true;

        /** @type {number} Noise level [0-1] emitted by the player */
        this.noiseLevel = 0;

        /** @type {number} Direction player is facing (radians) */
        this.facingAngle = 0;

        /** @type {{x: number, y: number}} Last move direction vector */
        this.moveDirection = { x: 0, y: 0 };

        // ── Invulnerability ───────────────────────────────────
        /** @type {boolean} */
        this.invulnerable = false;

        /** @type {number} Timer remaining in ms */
        this.invulnerableTimer = 0;

        // ── Session tracking ──────────────────────────────────
        /** @type {number} */
        this.totalCoinsCollected = 0;

        /** @type {number} */
        this.totalRelicsCollected = 0;

        /** @type {number} */
        this.damageTaken = 0;

        /** @type {number} */
        this.abilitiesUsed = 0;

        /** @type {boolean} Set by stealth system when enemies see the player */
        this.detected = false;

        // ── Visual animation state ────────────────────────────
        /** @private */
        this._flashTimer = 0;
    }

    // ──────────────────────────────────────────────────────────
    //  Update
    // ──────────────────────────────────────────────────────────

    /**
     * Per-tick update — handles invulnerability countdown.
     * Movement is handled entirely by PlayerController.
     * @param {number} dt - Fixed timestep delta in ms
     */
    update(dt) {
        // Sync pixel position from grid coords (base class helper)
        super.update(dt);

        // Invulnerability countdown
        if (this.invulnerable) {
            this.invulnerableTimer -= dt;
            this._flashTimer += dt;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
                this.invulnerableTimer = 0;
                this._flashTimer = 0;
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Rendering
    // ──────────────────────────────────────────────────────────

    /**
     * Render the player on the game canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../engine/Camera.js').default} camera
     */
    render(ctx, camera) {
        const screen = camera.worldToScreen(this.px, this.py);
        const sx = screen.x;
        const sy = screen.y;
        const radius = (P_CONST.SIZE * TILE_SIZE) / 2;

        ctx.save();

        // ── Invulnerability flash ──────────────────────────────
        if (this.invulnerable) {
            const flash = Math.sin(this._flashTimer / 60 * Math.PI * 2);
            if (flash < 0) {
                ctx.globalAlpha = 0.3;
            }
        }

        // ── Cloak shimmer ──────────────────────────────────────
        if (!this.isVisible) {
            ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 200) * 0.1;
        }

        // ── Outer glow ────────────────────────────────────────
        ctx.shadowColor = COLORS.PLAYER_GLOW;
        ctx.shadowBlur = this.isSprinting ? 18 : 12;

        // ── Body — hexagonal shape ────────────────────────────
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const sides = 6;
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const hx = sx + radius * Math.cos(angle);
            const hy = sy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();

        // ── Inner glow ────────────────────────────────────────
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // ── Direction indicator (triangle) ────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.9);
        const triLen = radius * 0.7;
        const triWidth = radius * 0.35;
        const angle = this.facingAngle;

        ctx.beginPath();
        ctx.moveTo(
            sx + Math.cos(angle) * triLen,
            sy + Math.sin(angle) * triLen
        );
        ctx.lineTo(
            sx + Math.cos(angle + 2.5) * triWidth,
            sy + Math.sin(angle + 2.5) * triWidth
        );
        ctx.lineTo(
            sx + Math.cos(angle - 2.5) * triWidth,
            sy + Math.sin(angle - 2.5) * triWidth
        );
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // ── Health pips ───────────────────────────────────────
        this._renderHealthPips(ctx, sx, sy, radius);
    }

    /**
     * Draw small HP pips above the player.
     * @private
     */
    _renderHealthPips(ctx, sx, sy, radius) {
        const pipRadius = 3;
        const spacing = 10;
        const startX = sx - ((this.maxHp - 1) * spacing) / 2;
        const pipY = sy - radius - 8;

        for (let i = 0; i < this.maxHp; i++) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(startX + i * spacing, pipY, pipRadius, 0, Math.PI * 2);
            if (i < this.hp) {
                ctx.fillStyle = COLORS.HP_BAR;
                ctx.shadowColor = COLORS.HP_BAR;
                ctx.shadowBlur = 4;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
            }
            ctx.fill();
            ctx.restore();
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Combat
    // ──────────────────────────────────────────────────────────

    /**
     * Inflict damage on the player.
     * @param {number} amount
     */
    takeDamage(amount) {
        if (this.invulnerable) return;

        this.hp = clamp(this.hp - amount, 0, this.maxHp);
        this.damageTaken += amount;

        // Start invulnerability window
        this.invulnerable = true;
        this.invulnerableTimer = P_CONST.INVULNERABILITY_TIME;
        this._flashTimer = 0;

        gameEvents.emit('player:damaged', {
            hp: this.hp,
            maxHp: this.maxHp,
            amount,
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    /**
     * Restore health.
     * @param {number} amount
     */
    heal(amount) {
        this.hp = clamp(this.hp + amount, 0, this.maxHp);
        gameEvents.emit('player:healed', { hp: this.hp, maxHp: this.maxHp });
    }

    /**
     * Handle player death.
     */
    die() {
        this.active = false;
        gameEvents.emit('player:died', {
            coinsCollected: this.totalCoinsCollected,
            relicsCollected: this.totalRelicsCollected,
            damageTaken: this.damageTaken,
        });
    }
}
