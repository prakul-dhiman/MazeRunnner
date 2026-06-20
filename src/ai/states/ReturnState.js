/**
 * MazeBreaker: Shadow Protocol — Return State
 * Enemy navigates back to its spawn point after losing the player.
 * Transitions to PATROL on arrival, CHASE if player spotted en route.
 */

import { AI_STATES } from '../../constants.js';
import { distance, lerp } from '../../utils/MathUtils.js';

/** Rate at which alert level decreases per second while returning. */
const ALERT_DECAY_RATE = 0.15;

/**
 * Create a Return state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createReturnState() {
    return {
        name: AI_STATES.RETURN,

        /**
         * Calculate path back to spawn.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            owner._requestPathTo({ col: owner.spawnCol, row: owner.spawnRow });
        },

        /**
         * Move toward spawn, scanning for player along the way.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         * @param {number} dt
         */
        update(owner, dt) {
            // Check for player visibility → CHASE
            if (owner.playerRef) {
                const playerPos = { col: owner.playerRef.x, row: owner.playerRef.y };
                if (owner.canSeeTarget(playerPos, owner.grid)) {
                    owner.lastKnownPlayerPos = { ...playerPos };
                    owner.fsm.setState(AI_STATES.CHASE);
                    return;
                }
            }

            // Gradually decrease alert level
            const dtSec = dt / 1000;
            owner.alertLevel = Math.max(0, owner.alertLevel - ALERT_DECAY_RATE * dtSec);

            // Move along path
            owner.moveAlongPath(dt);

            // Check if we've reached spawn
            if (distance(owner.x, owner.y, owner.spawnCol, owner.spawnRow) < 0.3) {
                owner.fsm.setState(AI_STATES.PATROL);
                return;
            }

            // Path exhausted but not at spawn — re-request
            if (!owner.currentPath || owner.pathIndex >= owner.currentPath.length) {
                owner._requestPathTo({ col: owner.spawnCol, row: owner.spawnRow });
            }
        },

        /**
         * Reset alert level on exit.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            owner.alertLevel = 0;
        },
    };
}
