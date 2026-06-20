/**
 * MazeBreaker: Shadow Protocol — Math Utilities
 * Common math operations for game systems.
 */

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate distance between two points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Squared distance (avoids sqrt for comparison).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * Normalize a 2D vector.
 * @param {number} x
 * @param {number} y
 * @returns {{x: number, y: number}}
 */
export function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

/**
 * Random float in range [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Random integer in range [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate angle between two points in radians.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Normalize an angle to [-PI, PI].
 * @param {number} angle
 * @returns {number}
 */
export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

/**
 * Check if an angle is within a cone defined by direction and half-angle.
 * @param {number} angle - The angle to check
 * @param {number} direction - Center direction of the cone
 * @param {number} halfAngle - Half the cone's angular width
 * @returns {boolean}
 */
export function isAngleInCone(angle, direction, halfAngle) {
    const diff = normalizeAngle(angle - direction);
    return Math.abs(diff) <= halfAngle;
}

/**
 * Smooth step interpolation (ease in/out).
 * @param {number} t - Value in [0, 1]
 * @returns {number}
 */
export function smoothStep(t) {
    return t * t * (3 - 2 * t);
}

/**
 * Ease out cubic.
 * @param {number} t
 * @returns {number}
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in out quad.
 * @param {number} t
 * @returns {number}
 */
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Convert grid coordinates to pixel coordinates (center of tile).
 * @param {number} col
 * @param {number} row
 * @param {number} tileSize
 * @returns {{x: number, y: number}}
 */
export function gridToPixel(col, row, tileSize) {
    return {
        x: col * tileSize + tileSize / 2,
        y: row * tileSize + tileSize / 2,
    };
}

/**
 * Convert pixel coordinates to grid coordinates.
 * @param {number} x
 * @param {number} y
 * @param {number} tileSize
 * @returns {{col: number, row: number}}
 */
export function pixelToGrid(x, y, tileSize) {
    return {
        col: Math.floor(x / tileSize),
        row: Math.floor(y / tileSize),
    };
}

/**
 * Shuffle an array in place (Fisher-Yates).
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Check if two axis-aligned bounding boxes overlap.
 * @param {{x: number, y: number, w: number, h: number}} a
 * @param {{x: number, y: number, w: number, h: number}} b
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}
