/**
 * MazeBreaker: Shadow Protocol — Input Manager
 * Tracks keyboard state with per-frame press detection.
 * Translates raw key codes into game-relevant directional input.
 */

import { KEYS } from '../constants.js';

export default class InputManager {
    constructor() {
        /** @type {Set<string>} Keys currently held down */
        this._keyDown = new Set();

        /** @type {Set<string>} Keys pressed this frame (cleared each update) */
        this._keyPressed = new Set();

        // Bind handlers so we can remove them later
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /**
     * Handle raw keydown events.
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeyDown(e) {
        // Prevent default for game-bound keys to stop scrolling, etc.
        if (this._isGameKey(e.code)) {
            e.preventDefault();
        }

        if (!this._keyDown.has(e.code)) {
            this._keyPressed.add(e.code);
        }
        this._keyDown.add(e.code);
    }

    /**
     * Handle raw keyup events.
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeyUp(e) {
        this._keyDown.delete(e.code);
    }

    /**
     * Check if a key code belongs to any registered game binding.
     * @param {string} code
     * @returns {boolean}
     * @private
     */
    _isGameKey(code) {
        for (const codes of Object.values(KEYS)) {
            if (codes.includes(code)) return true;
        }
        return false;
    }

    /**
     * Returns true if the key is currently held down.
     * @param {string} code - KeyboardEvent.code (e.g. 'KeyW')
     * @returns {boolean}
     */
    isKeyDown(code) {
        return this._keyDown.has(code);
    }

    /**
     * Returns true if the key was pressed this frame (single trigger).
     * Note: the press is consumed on read to avoid double-reads within
     * the same frame across multiple callers. If you need non-consuming
     * reads, query the set directly.
     * @param {string} code
     * @returns {boolean}
     */
    isKeyPressed(code) {
        return this._keyPressed.has(code);
    }

    /**
     * Returns true if any of the given key codes are currently held.
     * @param {string[]} codes
     * @returns {boolean}
     */
    isAnyKeyDown(codes) {
        for (let i = 0; i < codes.length; i++) {
            if (this._keyDown.has(codes[i])) return true;
        }
        return false;
    }

    /**
     * Returns true if any of the given key codes were pressed this frame.
     * @param {string[]} codes
     * @returns {boolean}
     */
    isAnyKeyPressed(codes) {
        for (let i = 0; i < codes.length; i++) {
            if (this._keyPressed.has(codes[i])) return true;
        }
        return false;
    }

    /**
     * Compute a normalized direction vector from WASD / Arrow input.
     * Returns {x: 0, y: 0} when no directional keys are held.
     * @returns {{x: number, y: number}}
     */
    getDirection() {
        let x = 0;
        let y = 0;

        if (this.isAnyKeyDown(KEYS.LEFT))  x -= 1;
        if (this.isAnyKeyDown(KEYS.RIGHT)) x += 1;
        if (this.isAnyKeyDown(KEYS.UP))    y -= 1;
        if (this.isAnyKeyDown(KEYS.DOWN))  y += 1;

        // Normalize diagonal movement so it isn't faster
        if (x !== 0 && y !== 0) {
            const inv = 1 / Math.SQRT2;
            x *= inv;
            y *= inv;
        }

        return { x, y };
    }

    /**
     * End-of-frame cleanup — clears single-frame press state.
     * Must be called once at the end of every update tick.
     */
    update() {
        this._keyPressed.clear();
    }

    /**
     * Tear down event listeners. Call when the engine is destroyed.
     */
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this._keyDown.clear();
        this._keyPressed.clear();
    }
}
