/**
 * MazeBreaker: Shadow Protocol — Main Menu
 * Controls the main menu screen and its animated maze background.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../constants.js';

/** Grid size for the ambient maze animation */
const ANIM_CELL = 20;
const COLS = Math.ceil(CANVAS_WIDTH / ANIM_CELL);
const ROWS = Math.ceil(CANVAS_HEIGHT / ANIM_CELL);

export default class MainMenu {
    constructor() {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('main-menu');

        /** @type {HTMLButtonElement|null} */
        this.continueBtn = document.getElementById('btn-continue');

        /** @type {number|null} Animation frame ID */
        this._animFrame = null;

        /** @type {CanvasRenderingContext2D|null} Background canvas context */
        this._bgCtx = document.getElementById('bg-canvas')?.getContext('2d');

        /** @type {number[][]} Animated line segments — each { x, y, alpha, growing } */
        this._segments = [];

        this._initSegments();
    }

    // ─── Lifecycle ──────────────────────────────────────────────

    /** Show the main menu and start the background animation loop. */
    show() {
        if (this.el) this.el.classList.add('active');
        this._startAnimation();
    }

    /** Hide the main menu and stop the background animation. */
    hide() {
        if (this.el) this.el.classList.remove('active');
        this._stopAnimation();
    }

    /**
     * Enable or disable the continue button based on existing save data.
     * @param {boolean} hasSave
     */
    updateContinueButton(hasSave) {
        if (!this.continueBtn) return;
        this.continueBtn.disabled = !hasSave;
        this.continueBtn.style.opacity = hasSave ? '1' : '0.35';
    }

    // ─── Background Animation ───────────────────────────────────

    /** Initialise segment array for the ambient maze animation. */
    _initSegments() {
        this._segments = [];
        for (let i = 0; i < 60; i++) {
            this._segments.push(this._createSegment());
        }
    }

    /** @private Create a single animated maze-line segment. */
    _createSegment() {
        const col = Math.floor(Math.random() * COLS);
        const row = Math.floor(Math.random() * ROWS);
        const horizontal = Math.random() > 0.5;
        return {
            x: col * ANIM_CELL,
            y: row * ANIM_CELL,
            length: (2 + Math.floor(Math.random() * 5)) * ANIM_CELL,
            horizontal,
            alpha: 0,
            phase: Math.random() * Math.PI * 2,
            speed: 0.004 + Math.random() * 0.006,
        };
    }

    /** @private Start the background animation loop. */
    _startAnimation() {
        if (this._animFrame) return;
        const loop = () => {
            this.animateBackground();
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    /** @private Stop the background animation loop. */
    _stopAnimation() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
    }

    /**
     * Draw animated maze pattern on the background canvas.
     * Lines slowly fade in and out creating an ambient generative effect.
     */
    animateBackground() {
        const ctx = this._bgCtx;
        if (!ctx) return;

        // Dim previous frame
        ctx.fillStyle = 'rgba(10, 10, 26, 0.12)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const now = Date.now() * 0.001;

        this._segments.forEach(seg => {
            // Sinusoidal fade cycle
            seg.alpha = 0.15 + 0.15 * Math.sin(now * seg.speed * 100 + seg.phase);

            ctx.strokeStyle = `rgba(0, 240, 255, ${seg.alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            if (seg.horizontal) {
                ctx.moveTo(seg.x, seg.y);
                ctx.lineTo(seg.x + seg.length, seg.y);
            } else {
                ctx.moveTo(seg.x, seg.y);
                ctx.lineTo(seg.x, seg.y + seg.length);
            }

            ctx.stroke();
        });
    }
}
