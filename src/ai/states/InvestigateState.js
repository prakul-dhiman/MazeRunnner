/**
 * MazeBreaker: Shadow Protocol — Investigate State
 * Enemy moves toward a reported disturbance location.
 * Transitions to SEARCH on arrival, CHASE on player sight, or PATROL on timeout.
 */

import { AI_STATES } from '../../constants.js';
import { distance } from '../../utils/MathUtils.js';

/** Maximum time (ms) to spend investigating before giving up. */
const INVESTIGATE_TIMEOUT = 5000;

/**
 * Create an Investigate state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createInvestigateState() {
    return {
        name: AI_STATES.INVESTIGATE,

        /**
         * Set investigation target and pathfind to it.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            owner._investigateTarget = owner.lastKnownDisturbance
                ? { ...owner.lastKnownDisturbance }
                : { col: owner.spawnCol, row: owner.spawnRow };
            owner._investigateTimer = 0;
            owner.alertLevel = Math.max(owner.alertLevel, 0.4);

            owner._requestPathTo(owner._investigateTarget);
        },

        /**
         * Move toward disturbance. Check for player, timeout, or arrival.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         * @param {number} dt
         */
        update(owner, dt) {
            owner._investigateTimer += dt;

            // Check for player visibility → CHASE
            if (owner.playerRef) {
                const playerPos = { col: owner.playerRef.x, row: owner.playerRef.y };
                if (owner.canSeeTarget(playerPos, owner.grid)) {
                    owner.lastKnownPlayerPos = { ...playerPos };
                    owner.fsm.setState(AI_STATES.CHASE);
                    return;
                }
            }

            // Timeout → return to patrol
            if (owner._investigateTimer >= INVESTIGATE_TIMEOUT) {
                owner.fsm.setState(AI_STATES.PATROL);
                return;
            }

            // Move along path
            owner.moveAlongPath(dt);

            // Reached disturbance location → search the area
            if (owner._investigateTarget &&
                distance(owner.x, owner.y, owner._investigateTarget.col, owner._investigateTarget.row) < 0.5) {
                owner.fsm.setState(AI_STATES.SEARCH);
                return;
            }

            // Path exhausted but not near target — re-request
            if (!owner.currentPath || owner.pathIndex >= owner.currentPath.length) {
                if (owner._investigateTarget) {
                    owner._requestPathTo(owner._investigateTarget);
                }
            }
        },

        /**
         * Clear investigation data.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            owner._investigateTarget = null;
            owner._investigateTimer = 0;
            owner.lastKnownDisturbance = null;
        },
    };
}
