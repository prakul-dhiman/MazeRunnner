/**
 * MazeBreaker: Shadow Protocol — Chase State
 * Enemy actively pursues the player using BFS pathfinding.
 * Transitions to ATTACK when close, SEARCH when sight lost.
 */

import { AI_STATES } from '../../constants.js';
import { distance } from '../../utils/MathUtils.js';
import { gameEvents } from '../../utils/EventBus.js';

/** Time (ms) of lost sight before giving up the chase. */
const SIGHT_LOST_TIMEOUT = 3000;
/** Default path recalculation interval (ms). */
const DEFAULT_PATH_RECALC = 500;
/** Speed multiplier while chasing. */
const CHASE_SPEED_MULT = 1.2;

/**
 * Create a Chase state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createChaseState() {
    return {
        name: AI_STATES.CHASE,

        /**
         * Begin chasing the player.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            gameEvents.emit('enemy:chaseStarted', {
                type: owner.type,
                col: Math.round(owner.x),
                row: Math.round(owner.y),
            });

            owner.alertLevel = 1.0;
            owner._chaseBaseSpeed = owner.speed;
            owner.speed *= CHASE_SPEED_MULT;
            owner._chaseSightTimer = 0;
            owner._chasePathTimer = 0;

            // Initial pathfind to player
            if (owner.lastKnownPlayerPos) {
                owner._requestPathTo(owner.lastKnownPlayerPos);
            }
        },

        /**
         * Pursue the player, recalculating the path periodically.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         * @param {number} dt
         */
        update(owner, dt) {
            const recalcInterval = owner.config.pathRecalcInterval || DEFAULT_PATH_RECALC;

            // Check if we can currently see the player
            let canSee = false;
            if (owner.playerRef) {
                const playerPos = { col: owner.playerRef.x, row: owner.playerRef.y };
                canSee = owner.canSeeTarget(playerPos, owner.grid);
                if (canSee) {
                    owner.lastKnownPlayerPos = { ...playerPos };
                    owner._chaseSightTimer = 0;
                }
            }

            // Lost sight timer
            if (!canSee) {
                owner._chaseSightTimer += dt;
                if (owner._chaseSightTimer >= SIGHT_LOST_TIMEOUT) {
                    owner.fsm.setState(AI_STATES.SEARCH);
                    return;
                }
            }

            // Recalculate path periodically
            owner._chasePathTimer += dt;
            if (owner._chasePathTimer >= recalcInterval && owner.lastKnownPlayerPos) {
                owner._chasePathTimer = 0;
                owner._requestPathTo(owner.lastKnownPlayerPos);
            }

            // Move along path
            owner.moveAlongPath(dt);

            // Check if close enough to attack
            if (owner.playerRef) {
                const dist = distance(owner.x, owner.y, owner.playerRef.x, owner.playerRef.y);
                if (dist < 1.0) {
                    owner.fsm.setState(AI_STATES.ATTACK);
                    return;
                }
            }
        },

        /**
         * End the chase.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            gameEvents.emit('enemy:chaseLost', {
                type: owner.type,
                col: Math.round(owner.x),
                row: Math.round(owner.y),
            });

            // Reset speed
            owner.speed = owner._chaseBaseSpeed || owner.config.speed;
            owner._chaseSightTimer = 0;
            owner._chasePathTimer = 0;
        },
    };
}
