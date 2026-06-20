/**
 * MazeBreaker: Shadow Protocol — Renderer
 * Manages the four-layer canvas rendering pipeline:
 *   bg   → static maze tiles
 *   game → entities (player, enemies, collectibles)
 *   fog  → fog-of-war overlay
 *   ui   → HUD elements
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/** @type {Object<string, string>} Layer name → canvas element id */
const LAYER_IDS = {
    bg: 'bg-canvas',
    game: 'game-canvas',
    fog: 'fog-canvas',
    ui: 'ui-canvas',
};

export default class Renderer {
    constructor() {
        /** @type {Object<string, HTMLCanvasElement>} */
        this._canvases = {};

        /** @type {Object<string, CanvasRenderingContext2D>} */
        this._contexts = {};

        // Resolve each canvas layer
        for (const [name, id] of Object.entries(LAYER_IDS)) {
            const canvas = document.getElementById(id);
            if (!canvas) {
                console.warn(`[Renderer] Canvas element #${id} not found.`);
                continue;
            }

            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            const ctx = canvas.getContext('2d');

            // Disable image smoothing for pixel-crisp rendering
            ctx.imageSmoothingEnabled = false;

            this._canvases[name] = canvas;
            this._contexts[name] = ctx;
        }

        // Convenience direct accessors
        /** @type {CanvasRenderingContext2D} Background context */
        this.bg = this._contexts.bg || null;
        /** @type {CanvasRenderingContext2D} Game entities context */
        this.game = this._contexts.game || null;
        /** @type {CanvasRenderingContext2D} Fog-of-war context */
        this.fog = this._contexts.fog || null;
        /** @type {CanvasRenderingContext2D} UI overlay context */
        this.ui = this._contexts.ui || null;
    }

    /**
     * Clear a single canvas layer.
     * @param {'bg' | 'game' | 'fog' | 'ui'} layerName
     */
    clear(layerName) {
        const ctx = this._contexts[layerName];
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    /**
     * Clear all four canvas layers.
     */
    clearAll() {
        for (const name of Object.keys(this._contexts)) {
            this.clear(name);
        }
    }

    /**
     * Get the 2D rendering context for a layer.
     * @param {'bg' | 'game' | 'fog' | 'ui'} layerName
     * @returns {CanvasRenderingContext2D | null}
     */
    getCtx(layerName) {
        return this._contexts[layerName] || null;
    }

    /**
     * Get the canvas element for a layer.
     * @param {'bg' | 'game' | 'fog' | 'ui'} layerName
     * @returns {HTMLCanvasElement | null}
     */
    getCanvas(layerName) {
        return this._canvases[layerName] || null;
    }

    /**
     * Handle window resize — re-scale canvases while keeping internal
     * resolution fixed at CANVAS_WIDTH × CANVAS_HEIGHT. The CSS handles
     * visual scaling; this ensures the backing store stays correct.
     */
    resize() {
        for (const [name, canvas] of Object.entries(this._canvases)) {
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            const ctx = this._contexts[name];
            if (ctx) {
                ctx.imageSmoothingEnabled = false;
            }
        }
    }
}
