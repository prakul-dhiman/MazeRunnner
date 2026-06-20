/**
 * MazeBreaker: Shadow Protocol — Search State
 * Enemy systematically checks random cells near the last known position.
 * Transitions to CHASE on player sight, RETURN after checking all points or timeout.
 */

import { AI_STATES } from '../../constants.js';
import { randomInt, distance, clamp } from '../../utils/MathUtils.js';

/** Maximum time (ms) to spend searching before giving up. */
const SEARCH_TIMEOUT = 8000;
/** Number of nearby cells to check. */
const SEARCH_POINTS = 3;
/** Maximum radius (tiles) around last known position to generate search points. */
const SEARCH_RADIUS = 3;

/**
 * Create a Search state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createSearchState() {
    return {
        name: AI_STATES.SEARCH,

        /**
         * Pick random cells near the last known position to check.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            owner._searchTimer = 0;
            owner._searchPoints = [];
            owner._searchIndex = 0;
            owner.alertLevel = Math.max(owner.alertLevel, 0.6);

            const grid = owner.grid;
            const rows = grid.length;
            const cols = grid[0].length;

            // Center search around last known player pos, or current pos
            const center = owner.lastKnownPlayerPos || { col: Math.round(owner.x), row: Math.round(owner.y) };

            // Gather candidates
            const candidates = [];
            for (let r = Math.max(0, center.row - SEARCH_RADIUS); r <= Math.min(rows - 1, center.row + SEARCH_RADIUS); r++) {
                for (let c = Math.max(0, center.col - SEARCH_RADIUS); c <= Math.min(cols - 1, center.col + SEARCH_RADIUS); c++) {
                    if (distance(c, r, center.col, center.row) <= SEARCH_RADIUS) {
                        candidates.push({ col: c, row: r });
                    }
                }
            }

            // Pick random search points
            for (let i = 0; i < SEARCH_POINTS && candidates.length > 0; i++) {
                const idx = randomInt(0, candidates.length - 1);
                owner._searchPoints.push(candidates[idx]);
                candidates.splice(idx, 1);
            }

            // Fallback
            if (owner._searchPoints.length === 0) {
                owner._searchPoints.push({ col: Math.round(owner.x), row: Math.round(owner.y) });
            }

            owner._requestPathTo(owner._searchPoints[0]);
        },

        /**
         * Move to each search point, scanning for the player.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         * @param {number} dt
         */
        update(owner, dt) {
            owner._searchTimer += dt;

            // Check for player visibility → CHASE
            if (owner.playerRef) {
                const playerPos = { col: owner.playerRef.x, row: owner.playerRef.y };
                if (owner.canSeeTarget(playerPos, owner.grid)) {
                    owner.lastKnownPlayerPos = { ...playerPos };
                    owner.fsm.setState(AI_STATES.CHASE);
                    return;
                }
            }

            // Timeout → give up and return
            if (owner._searchTimer >= SEARCH_TIMEOUT) {
                owner.fsm.setState(AI_STATES.RETURN);
                return;
            }

            // Move along path
            owner.moveAlongPath(dt);

            // Check if we reached the current search point
            const sp = owner._searchPoints[owner._searchIndex];
            if (sp && distance(owner.x, owner.y, sp.col, sp.row) < 0.4) {
                owner._searchIndex++;
                if (owner._searchIndex >= owner._searchPoints.length) {
                    // All points checked → return
                    owner.fsm.setState(AI_STATES.RETURN);
                    return;
                }
                owner._requestPathTo(owner._searchPoints[owner._searchIndex]);
            }

            // Path exhausted — re-request
            if (!owner.currentPath || owner.pathIndex >= owner.currentPath.length) {
                if (owner._searchIndex < owner._searchPoints.length) {
                    owner._requestPathTo(owner._searchPoints[owner._searchIndex]);
                }
            }
        },

        /**
         * Clear search data.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            owner._searchPoints = [];
            owner._searchIndex = 0;
            owner._searchTimer = 0;
        },
    };
}
