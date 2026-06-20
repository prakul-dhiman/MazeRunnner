/**
 * MazeBreaker: Shadow Protocol — Finite State Machine
 * Generic FSM supporting enter/update/exit lifecycle, global states,
 * and state history for revert.
 */

export default class FSM {
    /**
     * Create a new FSM for an entity.
     * @param {object} owner - The entity that owns this FSM.
     */
    constructor(owner) {
        /** @type {object} Entity that owns this FSM */
        this.owner = owner;

        /** @type {Map<string, {name:string, enter:Function, update:Function, exit:Function}>} */
        this._states = new Map();

        /** @type {{name:string, enter:Function, update:Function, exit:Function}|null} */
        this.currentState = null;

        /** @type {{name:string, enter:Function, update:Function, exit:Function}|null} */
        this.previousState = null;

        /**
         * Optional global state that runs every update regardless of current state.
         * @type {{name:string, enter:Function, update:Function, exit:Function}|null}
         */
        this.globalState = null;
    }

    /**
     * Register a state.
     * @param {string} name - Unique state name (e.g. AI_STATES.PATROL)
     * @param {{ name: string, enter: (owner: object) => void, update: (owner: object, dt: number) => void, exit: (owner: object) => void }} state
     */
    addState(name, state) {
        this._states.set(name, state);
    }

    /**
     * Set a global state that executes every update before the current state.
     * @param {{ name: string, enter: (owner: object) => void, update: (owner: object, dt: number) => void, exit: (owner: object) => void }} state
     */
    setGlobalState(state) {
        this.globalState = state;
        if (this.globalState && this.globalState.enter) {
            this.globalState.enter(this.owner);
        }
    }

    /**
     * Transition to a new state.
     * Calls exit() on the current state, enter() on the new state.
     * @param {string} name - Name of the state to transition to.
     */
    setState(name) {
        const newState = this._states.get(name);
        if (!newState) {
            console.warn(`[FSM] Unknown state: "${name}"`);
            return;
        }

        // Don't re-enter the same state
        if (this.currentState && this.currentState.name === name) return;

        this.previousState = this.currentState;

        if (this.currentState && this.currentState.exit) {
            this.currentState.exit(this.owner);
        }

        this.currentState = newState;

        if (this.currentState.enter) {
            this.currentState.enter(this.owner);
        }
    }

    /**
     * Alias for setState to support components calling transition().
     * @param {string} name
     */
    transition(name) {
        this.setState(name);
    }

    /**
     * Run one frame of the FSM.
     * Executes the global state first, then the current state's update.
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        if (this.globalState && this.globalState.update) {
            this.globalState.update(this.owner, dt);
        }
        if (this.currentState && this.currentState.update) {
            this.currentState.update(this.owner, dt);
        }
    }

    /**
     * Get the name of the current state.
     * @returns {string|null}
     */
    getCurrentStateName() {
        return this.currentState ? this.currentState.name : null;
    }

    /**
     * Revert to the previous state (if any).
     */
    revertToPreviousState() {
        if (this.previousState) {
            this.setState(this.previousState.name);
        }
    }

    /**
     * Check whether the FSM is currently in the given state.
     * @param {string} name
     * @returns {boolean}
     */
    isInState(name) {
        return this.currentState !== null && this.currentState.name === name;
    }
}
