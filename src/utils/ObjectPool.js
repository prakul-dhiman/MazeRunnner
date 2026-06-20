/**
 * MazeBreaker: Shadow Protocol — Object Pool
 * Generic pre-allocated object pool to prevent GC jank.
 * Used primarily for particles, projectiles, and temporary effects.
 */

export default class ObjectPool {
    /**
     * @param {Function} factory - Constructor or factory function for creating objects
     * @param {Function} reset - Function to reset an object to its initial state
     * @param {number} maxSize - Maximum pool capacity
     */
    constructor(factory, reset, maxSize) {
        this._factory = factory;
        this._reset = reset;
        this._maxSize = maxSize;
        this._pool = [];
        this._activeCount = 0;

        // Pre-allocate all objects
        for (let i = 0; i < maxSize; i++) {
            const obj = factory();
            obj.__poolActive = false;
            obj.__poolIndex = i;
            this._pool.push(obj);
        }
    }

    /**
     * Acquire an inactive object from the pool.
     * @returns {Object|null} An object from the pool, or null if all are active
     */
    acquire() {
        for (let i = 0; i < this._pool.length; i++) {
            const obj = this._pool[i];
            if (!obj.__poolActive) {
                obj.__poolActive = true;
                this._activeCount++;
                return obj;
            }
        }
        return null; // Pool exhausted
    }

    /**
     * Release an object back to the pool.
     * @param {Object} obj
     */
    release(obj) {
        if (obj.__poolActive) {
            obj.__poolActive = false;
            this._reset(obj);
            this._activeCount--;
        }
    }

    /**
     * Iterate over all active objects.
     * @param {Function} callback - Called with (obj, index)
     */
    forEach(callback) {
        for (let i = 0; i < this._pool.length; i++) {
            if (this._pool[i].__poolActive) {
                callback(this._pool[i], i);
            }
        }
    }

    /**
     * Release all active objects.
     */
    releaseAll() {
        for (let i = 0; i < this._pool.length; i++) {
            if (this._pool[i].__poolActive) {
                this._pool[i].__poolActive = false;
                this._reset(this._pool[i]);
            }
        }
        this._activeCount = 0;
    }

    /** Number of currently active objects */
    get activeCount() { return this._activeCount; }

    /** Maximum pool capacity */
    get maxSize() { return this._maxSize; }

    /** Number of available objects */
    get available() { return this._maxSize - this._activeCount; }
}
