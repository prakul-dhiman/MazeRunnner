/**
 * MazeBreaker: Shadow Protocol — Camera
 * Viewport camera with smooth following, screen shake, and
 * world ↔ screen coordinate transforms.
 */

import { TILE_SIZE } from '../constants.js';
import { lerp, clamp, randomRange } from '../utils/MathUtils.js';

export default class Camera {
    /**
     * @param {number} width  - Viewport width in pixels (CANVAS_WIDTH)
     * @param {number} height - Viewport height in pixels (CANVAS_HEIGHT)
     */
    constructor(width, height) {
        /** Viewport dimensions */
        this.width = width;
        this.height = height;

        /** Current camera top-left position in world pixels */
        this.x = 0;
        this.y = 0;

        /** Smoothed target position */
        this.targetX = 0;
        this.targetY = 0;

        /** Screen-shake state */
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        /** Lerp speed factor (higher = snappier tracking) */
        this.lerpSpeed = 0.12;
    }

    /**
     * Smoothly follow a target entity, centering it in the viewport.
     * @param {{ px: number, py: number }} target - Entity with pixel-space coords
     * @param {number} dt - Delta time in ms (unused for lerp factor, kept for API consistency)
     */
    follow(target, dt) {
        // Target position places the entity at screen center
        this.targetX = target.px - this.width / 2;
        this.targetY = target.py - this.height / 2;

        // Smooth interpolation toward target
        const t = clamp(this.lerpSpeed * (dt / 16.667), 0, 1);
        this.x = lerp(this.x, this.targetX, t);
        this.y = lerp(this.y, this.targetY, t);
    }

    /**
     * Trigger a screen-shake effect.
     * @param {number} intensity - Maximum pixel offset
     * @param {number} [duration=300] - Shake duration in ms
     */
    shake(intensity, duration = 300) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * Update shake offset. Call once per frame.
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = clamp(this.shakeTimer / this.shakeDuration, 0, 1);
            const currentIntensity = this.shakeIntensity * progress;
            this.shakeX = randomRange(-currentIntensity, currentIntensity);
            this.shakeY = randomRange(-currentIntensity, currentIntensity);
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    /**
     * Convert world-pixel coordinates to screen coordinates.
     * @param {number} wx - World X in pixels
     * @param {number} wy - World Y in pixels
     * @returns {{x: number, y: number}} Screen coordinates
     */
    worldToScreen(wx, wy) {
        return {
            x: wx - this.x + this.shakeX,
            y: wy - this.y + this.shakeY,
        };
    }

    /**
     * Convert screen coordinates back to world-pixel coordinates.
     * @param {number} sx - Screen X
     * @param {number} sy - Screen Y
     * @returns {{x: number, y: number}} World-pixel coordinates
     */
    screenToWorld(sx, sy) {
        return {
            x: sx + this.x - this.shakeX,
            y: sy + this.y - this.shakeY,
        };
    }

    /**
     * Get the visible rectangle in world-pixel space.
     * @returns {{left: number, top: number, right: number, bottom: number}}
     */
    getBounds() {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height,
        };
    }

    /**
     * Check if a world-pixel position is within the visible viewport (+ margin).
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} [margin=64] - Extra margin in pixels
     * @returns {boolean}
     */
    isVisible(x, y, margin = 64) {
        const bounds = this.getBounds();
        return (
            x >= bounds.left - margin &&
            x <= bounds.right + margin &&
            y >= bounds.top - margin &&
            y <= bounds.bottom + margin
        );
    }

    /**
     * Clamp camera within the world bounds so we never show outside the maze.
     * @param {number} worldWidth  - Total world width in pixels
     * @param {number} worldHeight - Total world height in pixels
     */
    clampToBounds(worldWidth, worldHeight) {
        this.x = clamp(this.x, 0, Math.max(0, worldWidth - this.width));
        this.y = clamp(this.y, 0, Math.max(0, worldHeight - this.height));
    }
}
