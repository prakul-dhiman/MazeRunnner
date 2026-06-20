/**
 * MazeBreaker: Shadow Protocol — Patrol State
 * Enemy wanders between random waypoints within its patrol radius.
 * Transitions to CHASE on player sighting or INVESTIGATE on disturbance.
 */

import { AI_STATES } from '../../constants.js';
import { randomInt, distance } from '../../utils/MathUtils.js';

/**
 * Create a Patrol state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createPatrolState() {
    return {
        name: AI_STATES.PATROL,

        /**
         * Pick 3-5 random waypoints within patrolRadius of the spawn point.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            const count = randomInt(3, 5);
            owner._patrolWaypoints = [];
            owner._patrolIndex = 0;

            const grid = owner.grid;
            const rows = grid.length;
            const cols = grid[0].length;
            const radius = owner.patrolRadius;

            // Gather candidate cells within radius of spawn
            const candidates = [];
            for (let r = Math.max(0, owner.spawnRow - radius); r <= Math.min(rows - 1, owner.spawnRow + radius); r++) {
                for (let c = Math.max(0, owner.spawnCol - radius); c <= Math.min(cols - 1, owner.spawnCol + radius); c++) {
                    const d = distance(c, r, owner.spawnCol, owner.spawnRow);
                    if (d <= radius && d > 1) {
                        candidates.push({ col: c, row: r });
                    }
                }
            }

            // Pick random waypoints from candidates
            for (let i = 0; i < count && candidates.length > 0; i++) {
                const idx = randomInt(0, candidates.length - 1);
                owner._patrolWaypoints.push(candidates[idx]);
                candidates.splice(idx, 1);
            }

            // Fallback: if not enough candidates, just patrol around spawn
            if (owner._patrolWaypoints.length === 0) {
                owner._patrolWaypoints.push({ col: owner.spawnCol, row: owner.spawnRow });
            }

            // Pathfind to the first waypoint
            owner._requestPathTo(owner._patrolWaypoints[0]);
        },

        /**
         * Move toward current waypoint, check for player/disturbances.
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

            // Check for disturbance → INVESTIGATE
            if (owner.lastKnownDisturbance) {
                owner.fsm.setState(AI_STATES.INVESTIGATE);
                return;
            }

            // Move along current path
            owner.moveAlongPath(dt);

            // Check if we've reached the current waypoint
            const wp = owner._patrolWaypoints[owner._patrolIndex];
            if (wp && distance(owner.x, owner.y, wp.col, wp.row) < 0.3) {
                // Advance to next waypoint (loop)
                owner._patrolIndex = (owner._patrolIndex + 1) % owner._patrolWaypoints.length;
                owner._requestPathTo(owner._patrolWaypoints[owner._patrolIndex]);
            }

            // If no path or path exhausted, re-request
            if (!owner.currentPath || owner.pathIndex >= owner.currentPath.length) {
                const nextWp = owner._patrolWaypoints[owner._patrolIndex];
                if (nextWp) {
                    owner._requestPathTo(nextWp);
                }
            }
        },

        /**
         * Clean up patrol data.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            owner._patrolWaypoints = [];
            owner._patrolIndex = 0;
        },
    };
}
