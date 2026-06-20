/**
 * MazeBreaker: Shadow Protocol — Base Enemy
 * Core enemy class with FSM-driven AI, vision cone, line-of-sight,
 * pathfinding integration, and full render pipeline.
 */

import Entity from '../Entity.js';
import { TILE_SIZE, AI_STATES, COLORS } from '../../constants.js';
import { distance, angleBetween, normalizeAngle, isAngleInCone, clamp, gridToPixel } from '../../utils/MathUtils.js';
import { gameEvents } from '../../utils/EventBus.js';
import FSM from '../../ai/FSM.js';
import PathfindingSystem from '../../ai/PathfindingSystem.js';
import { createPatrolState } from '../../ai/states/PatrolState.js';
import { createInvestigateState } from '../../ai/states/InvestigateState.js';
import { createSearchState } from '../../ai/states/SearchState.js';
import { createChaseState } from '../../ai/states/ChaseState.js';
import { createAttackState } from '../../ai/states/AttackState.js';
import { createReturnState } from '../../ai/states/ReturnState.js';

/** Shared pathfinder instance (all enemies share BFS cache). */
const pathfinder = new PathfindingSystem();

/** State indicator colors by AI state. */
const STATE_COLORS = {
    [AI_STATES.PATROL]: '#39ff14',
    [AI_STATES.INVESTIGATE]: '#ffe600',
    [AI_STATES.SEARCH]: '#ff6a00',
    [AI_STATES.CHASE]: '#ff073a',
    [AI_STATES.ATTACK]: '#ff0000',
    [AI_STATES.RETURN]: '#00f0ff',
};

export default class Enemy extends Entity {
    /**
     * @param {number} col - Spawn grid column
     * @param {number} row - Spawn grid row
     * @param {object} config - Enemy type config from ENEMIES constant
     * @param {Array<Array>} grid - The maze grid
     */
    constructor(col, row, config, grid) {
        super(col, row, TILE_SIZE * 0.65, TILE_SIZE * 0.65);

        /** @type {object} Full config object */
        this.config = config;
        /** @type {Array<Array>} Reference to maze grid */
        this.grid = grid;

        // Copy config values as own properties
        /** @type {string} */
        this.type = config.type;
        this.speed = config.speed;
        /** @type {number} Vision range in tiles */
        this.visionRange = config.visionRange;
        /** @type {number} Vision cone half-angle in radians */
        this.visionAngle = config.visionAngle;
        this.color = config.color;
        /** @type {string} */
        this.glowColor = config.glowColor;
        /** @type {number} */
        this.detectionRate = config.detectionRate;
        /** @type {number} */
        this.attackDamage = config.attackDamage;
        /** @type {number} */
        this.attackCooldown = config.attackCooldown;
        /** @type {number} */
        this.patrolRadius = config.patrolRadius || 6;

        // Spawn reference (for Return state)
        /** @type {number} */
        this.spawnCol = col;
        /** @type {number} */
        this.spawnRow = row;

        // AI tracking
        /** @type {number} 0 = calm, 1 = fully alerted */
        this.alertLevel = 0;
        /** @type {Array<{col:number,row:number}>} */
        this.currentPath = [];
        /** @type {number} */
        this.pathIndex = 0;
        /** @type {object|null} Externally assigned reference to the player entity */
        this.playerRef = null;
        /** @type {{col:number,row:number}|null} */
        this.lastKnownPlayerPos = null;
        /** @type {{col:number,row:number}|null} */
        this.lastKnownDisturbance = null;
        /** @type {number} */
        this.pathRecalcTimer = 0;
        /** @type {number} */
        this.attackTimer = 0;

        // EMP disable
        /** @type {boolean} */
        this.disabled = false;
        /** @type {number} */
        this.disabledTimer = 0;

        // Internal patrol data (used by PatrolState)
        /** @type {Array<{col:number,row:number}>} */
        this._patrolWaypoints = [];
        /** @type {number} */
        this._patrolIndex = 0;

        // Set up FSM
        /** @type {FSM} */
        this.fsm = new FSM(this);
        this.fsm.addState(AI_STATES.PATROL, createPatrolState());
        this.fsm.addState(AI_STATES.INVESTIGATE, createInvestigateState());
        this.fsm.addState(AI_STATES.SEARCH, createSearchState());
        this.fsm.addState(AI_STATES.CHASE, createChaseState());
        this.fsm.addState(AI_STATES.ATTACK, createAttackState());
        this.fsm.addState(AI_STATES.RETURN, createReturnState());
        this.fsm.setState(AI_STATES.PATROL);
    }

    // ── Update ──────────────────────────────────────────────────

    /**
     * Tick enemy AI and movement.
     * @param {number} dt - Delta time (ms)
     * @param {{ col: number, row: number }} [playerPos] - Optional direct player position
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
            super.update(dt);
            return;
        }

        this.fsm.update(dt);
        super.update(dt);
    }

    // ── Rendering ───────────────────────────────────────────────

    /**
     * Draw the enemy: body, vision cone, alert indicator, state dot.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x:number,y:number)=>{x:number,y:number} }} camera
     */
    render(ctx, camera) {
        if (!this.active) return;

        const screen = camera.worldToScreen(this.px, this.py);
        const r = this.width / 2;

        // ── Vision cone ──
        this._renderVisionCone(ctx, screen, r);

        // ── Glow ──
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.disabled ? 2 : 12;

        // ── Body circle ──
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#555555' : this.color;
        ctx.globalAlpha = this.disabled ? 0.4 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        // ── Alert indicator ("!" above head) ──
        if (this.alertLevel > 0.5 && !this.disabled) {
            ctx.save();
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.getAlertColor();
            ctx.fillText('!', screen.x, screen.y - r - 6);
            ctx.restore();
        }

        // ── State indicator dot ──
        const stateName = this.fsm.getCurrentStateName();
        const dotColor = STATE_COLORS[stateName] || '#ffffff';
        ctx.beginPath();
        ctx.arc(screen.x + r + 3, screen.y - r - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
    }

    /**
     * Draw the translucent vision cone arc.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x:number,y:number}} screen
     * @param {number} r - body radius
     */
    _renderVisionCone(ctx, screen, r) {
        if (this.disabled) return;

        const visionPx = this.visionRange * TILE_SIZE;
        const halfAngle = this.visionAngle / 2;

        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.arc(screen.x, screen.y, visionPx, this.facingAngle - halfAngle, this.facingAngle + halfAngle);
        ctx.closePath();
        ctx.fillStyle = this.glowColor.replace(/44$/, 'aa');
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ── Vision & Line of Sight ──────────────────────────────────

    /**
     * Check if a target position is visible: range + cone + LOS.
     * @param {{ col: number, row: number }} targetPos
     * @param {Array<Array>} grid
     * @returns {boolean}
     */
    canSeeTarget(targetPos, grid) {
        const dist = distance(this.x, this.y, targetPos.col, targetPos.row);
        if (dist > this.visionRange) return false;

        // Check cone (skip for 360° vision like Sentinel)
        if (this.visionAngle < Math.PI * 2 - 0.01) {
            const angle = angleBetween(this.x, this.y, targetPos.col, targetPos.row);
            if (!isAngleInCone(angle, this.facingAngle, this.visionAngle / 2)) {
                return false;
            }
        }

        // Line of sight check
        return this.lineOfSight(
            Math.round(this.x), Math.round(this.y),
            Math.round(targetPos.col), Math.round(targetPos.row),
            grid
        );
    }

    /**
     * Step-based raycast to check for wall obstructions between two cells.
     * @param {number} fromCol
     * @param {number} fromRow
     * @param {number} toCol
     * @param {number} toRow
     * @param {Array<Array>} grid
     * @returns {boolean} True if no walls block the line.
     */
    lineOfSight(fromCol, fromRow, toCol, toRow, grid) {
        const rows = grid.length;
        const cols = grid[0].length;

        // Use a simple DDA / step-based approach
        let dx = toCol - fromCol;
        let dy = toRow - fromRow;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return true;

        const stepX = dx / steps;
        const stepY = dy / steps;
        let cx = fromCol;
        let cy = fromRow;

        for (let i = 0; i < steps; i++) {
            const prevCol = Math.round(cx);
            const prevRow = Math.round(cy);
            cx += stepX;
            cy += stepY;
            const nextCol = Math.round(cx);
            const nextRow = Math.round(cy);

            if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) return false;

            // Check wall between prev and next
            const dc = nextCol - prevCol;
            const dr = nextRow - prevRow;

            if (dc !== 0 || dr !== 0) {
                const cell = grid[prevRow]?.[prevCol];
                if (!cell) return false;

                // Determine which wall we'd cross
                if (dc === 1 && cell.walls.right) return false;
                if (dc === -1 && cell.walls.left) return false;
                if (dr === 1 && cell.walls.bottom) return false;
                if (dr === -1 && cell.walls.top) return false;
            }
        }

        return true;
    }

    // ── Path Movement ───────────────────────────────────────────

    /**
     * Move the enemy along its current BFS path.
     * @param {number} dt - Delta time (ms)
     */
    moveAlongPath(dt) {
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) return;

        const target = this.currentPath[this.pathIndex];
        const dx = target.col - this.x;
        const dy = target.row - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) {
            // Snap and advance
            this.x = target.col;
            this.y = target.row;
            this.pathIndex++;
            return;
        }

        // Normalize and move
        const moveSpeed = this.speed * (dt / 1000);
        const step = Math.min(moveSpeed, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;

        // Update facing angle toward movement direction
        this.facingAngle = Math.atan2(dy, dx);
    }

    /**
     * Replace the current path.
     * @param {Array<{col:number,row:number}>|null} path
     */
    setPath(path) {
        this.currentPath = path || [];
        this.pathIndex = 0;
    }

    /**
     * Request a path from the shared pathfinder.
     * @param {{ col: number, row: number }} goal
     */
    _requestPathTo(goal) {
        const start = {
            col: Math.round(this.x),
            row: Math.round(this.y),
        };
        const canPhase = this.config.canPhaseWalls || false;
        const path = pathfinder.findPath(this.grid, start, goal, canPhase);
        this.setPath(path);
    }

    // ── Utility ─────────────────────────────────────────────────

    /**
     * Disable the enemy for a duration (EMP effect).
     * @param {number} duration - Disable time in milliseconds
     */
    disable(duration) {
        this.disabled = true;
        this.disabledTimer = duration;
        this.currentPath = [];
        this.pathIndex = 0;
    }

    /**
     * Get a color reflecting the current alert level (green → yellow → red).
     * @returns {string}
     */
    getAlertColor() {
        if (this.alertLevel < 0.33) return COLORS.DETECTION_LOW;
        if (this.alertLevel < 0.66) return COLORS.DETECTION_MED;
        return COLORS.DETECTION_HIGH;
    }

    /**
     * Access the shared pathfinder (for subclasses that need direct access).
     * @returns {PathfindingSystem}
     */
    static getPathfinder() {
        return pathfinder;
    }
}
