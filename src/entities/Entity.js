/**
 * MazeBreaker: Shadow Protocol — Base Entity
 * Abstract base class for all game entities (player, enemies, collectibles).
 * Manages grid↔pixel coordinate conversion and common properties.
 */

import { TILE_SIZE } from '../constants.js';
import { distance as dist, gridToPixel } from '../utils/MathUtils.js';

export default class Entity {
    /**
     * Create a new entity.
     * @param {number} x - Grid column
     * @param {number} y - Grid row
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    constructor(x, y, width = TILE_SIZE * 0.7, height = TILE_SIZE * 0.7) {
        /** @type {number} Grid column */
        this.x = x;
        /** @type {number} Grid row */
        this.y = y;
        /** @type {number} Width in pixels */
        this.width = width;
        /** @type {number} Height in pixels */
        this.height = height;

        // Pixel-space center position (derived from grid coords)
        const px = gridToPixel(x, y, TILE_SIZE);
        /** @type {number} Pixel-space center X */
        this.px = px.x;
        /** @type {number} Pixel-space center Y */
        this.py = px.y;

        /** @type {number} Movement speed in tiles/second */
        this.speed = 1;
        /** @type {string} Entity color */
        this.color = '#ffffff';
        /** @type {boolean} Whether this entity is active */
        this.active = true;
        /** @type {number} Direction entity is facing (radians) */
        this.facingAngle = 0;
    }

    /**
     * Update entity state. Override in subclasses.
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        // Sync pixel position from grid coords
        const px = gridToPixel(this.x, this.y, TILE_SIZE);
        this.px = px.x;
        this.py = px.y;
    }

    /**
     * Render entity. Override in subclasses.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ worldToScreen: (x: number, y: number) => {x: number, y: number} }} camera
     */
    render(ctx, camera) {
        // Base class does nothing — subclasses implement visuals
    }

    /**
     * Get axis-aligned bounding box in pixel space.
     * @returns {{ x: number, y: number, w: number, h: number }}
     */
    getBounds() {
        return {
            x: this.px - this.width / 2,
            y: this.py - this.height / 2,
            w: this.width,
            h: this.height,
        };
    }

    /**
     * Get current grid position as {col, row}.
     * @returns {{ col: number, row: number }}
     */
    getGridPos() {
        return {
            col: Math.round(this.x),
            row: Math.round(this.y),
        };
    }

    /**
     * Calculate distance to another entity in grid units.
     * @param {Entity} other
     * @returns {number}
     */
    distanceTo(other) {
        return dist(this.x, this.y, other.x, other.y);
    }

    /**
     * Snap entity to an exact grid cell.
     * @param {number} col
     * @param {number} row
     */
    setGridPosition(col, row) {
        this.x = col;
        this.y = row;
        const px = gridToPixel(col, row, TILE_SIZE);
        this.px = px.x;
        this.py = px.y;
    }
}
