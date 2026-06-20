/**
 * MazeBreaker: Shadow Protocol — Event Bus
 * Decoupled publish/subscribe system for cross-module communication.
 * Uses native EventTarget for zero-dependency implementation.
 */

class EventBus {
    constructor() {
        this._target = new EventTarget();
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} event - Event name (e.g., 'player:damaged', 'level:complete')
     * @param {Function} callback - Handler function receiving event detail
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        const handler = (e) => callback(e.detail);
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ callback, handler });
        this._target.addEventListener(event, handler);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once.
     * @param {string} event
     * @param {Function} callback
     */
    once(event, callback) {
        const handler = (e) => {
            callback(e.detail);
            this.off(event, callback);
        };
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ callback, handler });
        this._target.addEventListener(event, handler);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;

        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            this._target.removeEventListener(event, listeners[index].handler);
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit an event with optional data.
     * @param {string} event
     * @param {*} [detail] - Data to pass to subscribers
     */
    emit(event, detail) {
        this._target.dispatchEvent(new CustomEvent(event, { detail }));
    }

    /**
     * Remove all listeners for a specific event or all events.
     * @param {string} [event] - If omitted, clears all listeners
     */
    clear(event) {
        if (event) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                listeners.forEach(l => {
                    this._target.removeEventListener(event, l.handler);
                });
                this._listeners.delete(event);
            }
        } else {
            this._listeners.forEach((listeners, evt) => {
                listeners.forEach(l => {
                    this._target.removeEventListener(evt, l.handler);
                });
            });
            this._listeners.clear();
        }
    }
}

/** Singleton game event bus */
export const gameEvents = new EventBus();
export default EventBus;
