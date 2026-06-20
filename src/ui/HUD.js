/**
 * MazeBreaker: Shadow Protocol — Heads-Up Display
 * Renders in-game HUD elements on the UI canvas layer.
 */

import { TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, ABILITIES } from '../constants.js';
import { clamp } from '../utils/MathUtils.js';

/** HUD layout constants */
const PAD = 12;
const HEART_SIZE = 18;
const STAMINA_W = 140;
const STAMINA_H = 8;
const MINIMAP_SIZE = 120;
const ABILITY_SIZE = 44;
const ABILITY_GAP = 6;
const ABILITY_COUNT = 5;

export default class HUD {
    /**
     * @param {object} renderer - Game renderer that owns the canvas contexts
     */
    constructor(renderer) {
        /** @type {CanvasRenderingContext2D} */
        this.ctx = renderer?.ui ?? renderer?.uiCtx ?? document.getElementById('ui-canvas')?.getContext('2d');

        /** Animated coin display for smooth counter changes */
        this._displayedCoins = 0;
    }

    // ─── Main Render ────────────────────────────────────────────

    /**
     * Draw all HUD elements for the current frame.
     * @param {object} player - Player entity
     * @param {object[]} abilities - Array of ability states
     * @param {object} inventory - { coins, relics, totalRelics }
     * @param {object} levelData - { level, minimapUnlocked }
     * @param {number} time - Elapsed time in seconds
     * @param {object[]} [enemies=[]] - Enemy entities (for minimap / detection)
     * @param {number[][]} [grid=null] - Maze grid (for minimap)
     * @param {number[][]} [fogGrid=null] - Fog of war grid (for minimap)
     */
    render(player, abilities, inventory, levelData, time, enemies = [], grid = null, fogGrid = null) {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();

        // Health
        this._renderHealth(ctx, player);

        // Stamina
        this._renderStamina(ctx, player);

        // Level indicator — top centre
        this._renderLevelIndicator(ctx, levelData.level);

        // Coin counter — top right
        this._renderCoinCounter(ctx, inventory.coins);

        // Relic counter
        this._renderRelicCounter(ctx, inventory.relics, inventory.totalRelics);

        // Timer — bottom left
        this._renderTimer(ctx, time);

        // Ability bar — bottom centre
        this._renderAbilityBar(ctx, abilities);

        // Minimap (if unlocked)
        if (levelData.minimapUnlocked && grid) {
            this.renderMinimap(ctx, grid, player, enemies, fogGrid,
                CANVAS_WIDTH - MINIMAP_SIZE - PAD, PAD + 30, MINIMAP_SIZE);
        }

        // Detection vignette
        if (player.detected) {
            this.renderDetectionVignette(ctx, player.detectionIntensity ?? 0.5);
        }

        ctx.restore();
    }

    // ─── Health ─────────────────────────────────────────────────

    /** @private */
    _renderHealth(ctx, player) {
        const maxHp = player.maxHp ?? 3;
        const hp = clamp(player.hp ?? maxHp, 0, maxHp);
        const x = PAD;
        const y = PAD;

        for (let i = 0; i < maxHp; i++) {
            const hx = x + i * (HEART_SIZE + 4);
            ctx.font = `${HEART_SIZE}px Rajdhani`;
            ctx.fillStyle = i < hp ? COLORS.HP_BAR : '#333344';
            ctx.fillText('♥', hx, y + HEART_SIZE);
        }
    }

    // ─── Stamina ────────────────────────────────────────────────

    /** @private */
    _renderStamina(ctx, player) {
        const maxStamina = player.maxStamina ?? 100;
        const stamina = clamp(player.stamina ?? maxStamina, 0, maxStamina);
        const ratio = stamina / maxStamina;

        const x = PAD;
        const y = PAD + HEART_SIZE + 10;

        // Background track
        ctx.fillStyle = '#1a1a3e';
        ctx.beginPath();
        ctx.roundRect(x, y, STAMINA_W, STAMINA_H, 3);
        ctx.fill();

        // Fill
        const grad = ctx.createLinearGradient(x, y, x + STAMINA_W * ratio, y);
        grad.addColorStop(0, '#1aff5e');
        grad.addColorStop(1, COLORS.STAMINA_BAR);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, STAMINA_W * ratio, STAMINA_H, 3);
        ctx.fill();
    }

    // ─── Level Indicator ────────────────────────────────────────

    /** @private */
    _renderLevelIndicator(ctx, level) {
        const label = `SECTOR ${String(level).padStart(2, '0')}`;
        ctx.font = '600 16px Orbitron, sans-serif';
        ctx.fillStyle = COLORS.TEXT_ACCENT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, CANVAS_WIDTH / 2, PAD);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // ─── Coin Counter ───────────────────────────────────────────

    /** @private */
    _renderCoinCounter(ctx, coins) {
        // Smooth animation towards target
        this._displayedCoins += (coins - this._displayedCoins) * 0.15;
        const display = Math.round(this._displayedCoins);

        const x = CANVAS_WIDTH - PAD;
        const y = PAD + 16;

        ctx.font = '600 15px Orbitron, sans-serif';
        ctx.fillStyle = COLORS.COIN;
        ctx.textAlign = 'right';
        ctx.fillText(`◈ ${display}`, x, y);
        ctx.textAlign = 'left';
    }

    // ─── Relic Counter ──────────────────────────────────────────

    /** @private */
    _renderRelicCounter(ctx, relics, total) {
        const x = CANVAS_WIDTH - PAD;
        const y = PAD + 38;

        ctx.font = '500 13px Rajdhani, sans-serif';
        ctx.fillStyle = COLORS.RELIC;
        ctx.textAlign = 'right';
        ctx.fillText(`${relics}/${total} RELICS`, x, y);
        ctx.textAlign = 'left';
    }

    // ─── Timer ──────────────────────────────────────────────────

    /** @private */
    _renderTimer(ctx, timeSeconds) {
        const mins = Math.floor(timeSeconds / 60);
        const secs = Math.floor(timeSeconds % 60);
        const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        ctx.font = '500 14px "Share Tech Mono", monospace';
        ctx.fillStyle = COLORS.TEXT_SECONDARY;
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, PAD, CANVAS_HEIGHT - PAD);
        ctx.textBaseline = 'alphabetic';
    }

    // ─── Ability Bar ────────────────────────────────────────────

    /** @private */
    _renderAbilityBar(ctx, abilities) {
        const totalW = ABILITY_COUNT * ABILITY_SIZE + (ABILITY_COUNT - 1) * ABILITY_GAP;
        const startX = (CANVAS_WIDTH - totalW) / 2;
        const y = CANVAS_HEIGHT - ABILITY_SIZE - PAD;

        const abilityDefs = Object.values(ABILITIES);

        for (let i = 0; i < ABILITY_COUNT; i++) {
            const ability = abilities?.[i] ?? null;
            const def = abilityDefs[i] ?? null;
            const x = startX + i * (ABILITY_SIZE + ABILITY_GAP);
            this.renderAbilitySlot(ctx, ability, def, x, y, ABILITY_SIZE, i + 1);
        }
    }

    /**
     * Draw a single ability slot with cooldown arc.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object|null} ability - Runtime ability state { ready, active, cooldownRemaining, cooldownTotal }
     * @param {object|null} def - Ability definition from constants
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {number} keyNum - Key binding number (1-5)
     */
    renderAbilitySlot(ctx, ability, def, x, y, size, keyNum) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        const r = size / 2 - 2;

        const isLocked = !ability || ability.locked;
        const isReady = ability?.ready ?? false;
        const isActive = ability?.active ?? false;
        const cooldownRatio = ability ? (ability.cooldownRemaining ?? 0) / (ability.cooldownTotal || 1) : 0;

        // Background
        ctx.fillStyle = isLocked ? '#111122' : '#1a1a3e';
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 6);
        ctx.fill();

        // Active pulsing border
        if (isActive) {
            const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
            ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 6);
            ctx.stroke();
        } else if (isReady) {
            // Glow effect when ready
            ctx.shadowColor = def?.color ?? COLORS.NEON_CYAN;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = def?.color ?? COLORS.NEON_CYAN;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 6);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Cooldown radial sweep
        if (!isLocked && cooldownRatio > 0 && !isActive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * cooldownRatio, false);
            ctx.closePath();
            ctx.fill();
        }

        // Icon
        ctx.font = `${size * 0.45}px Rajdhani`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isLocked ? '#333344' : (isReady ? '#ffffff' : '#666688');
        ctx.fillText(isLocked ? '🔒' : (def?.icon ?? '?'), cx, cy - 2);

        // Key binding label
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillStyle = COLORS.TEXT_SECONDARY;
        ctx.fillText(String(keyNum), cx, y + size - 6);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // ─── Minimap ────────────────────────────────────────────────

    /**
     * Draw a small map showing explored areas, player, and enemies.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object[][]} grid - Maze grid
     * @param {object} player
     * @param {object[]} enemies
     * @param {number[][]} fogGrid
     * @param {number} x - Screen x
     * @param {number} y - Screen y
     * @param {number} size - Minimap pixel size
     */
    renderMinimap(ctx, grid, player, enemies, fogGrid, x, y, size) {
        const rows = grid.length;
        const cols = grid[0]?.length ?? 1;
        const cellW = size / cols;
        const cellH = size / rows;

        // Background
        ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
        ctx.strokeStyle = COLORS.NEON_CYAN + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, size + 4, size + 4, 4);
        ctx.fill();
        ctx.stroke();

        // Draw cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const fogState = fogGrid?.[r]?.[c] ?? 0; // 0 = hidden, 1 = explored, 2 = visible
                if (fogState === 0) continue;

                const cell = grid[r][c];
                const isWall = cell === 1 || cell?.wall;
                const px = x + c * cellW;
                const py = y + r * cellH;

                ctx.fillStyle = isWall
                    ? (fogState === 2 ? '#3a3a6a' : '#222244')
                    : (fogState === 2 ? '#1a1a3e' : '#0d0d1e');
                ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
            }
        }

        // Player dot
        const playerPx = x + (player.col ?? 0) * cellW + cellW / 2;
        const playerPy = y + (player.row ?? 0) * cellH + cellH / 2;
        ctx.fillStyle = COLORS.PLAYER;
        ctx.beginPath();
        ctx.arc(playerPx, playerPy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Enemy dots (only if visible in fog)
        enemies.forEach(enemy => {
            const er = enemy.row ?? 0;
            const ec = enemy.col ?? 0;
            const fogState = fogGrid?.[er]?.[ec] ?? 0;
            if (fogState < 2) return;

            ctx.fillStyle = enemy.color ?? COLORS.ENEMY_SCOUT;
            ctx.beginPath();
            ctx.arc(x + ec * cellW + cellW / 2, y + er * cellH + cellH / 2, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ─── Detection Vignette ─────────────────────────────────────

    /**
     * Red edge glow when being detected.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} intensity - 0-1
     */
    renderDetectionVignette(ctx, intensity) {
        const alpha = clamp(intensity, 0, 1) * 0.45;
        const grad = ctx.createRadialGradient(
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
        );
        grad.addColorStop(0, 'rgba(255, 7, 58, 0)');
        grad.addColorStop(1, `rgba(255, 7, 58, ${alpha})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}
