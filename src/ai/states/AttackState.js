/**
 * MazeBreaker: Shadow Protocol — Attack State
 * Enemy deals damage to the player on a cooldown timer.
 * Transitions back to CHASE if the player escapes range.
 */

import { AI_STATES } from '../../constants.js';
import { distance } from '../../utils/MathUtils.js';
import { gameEvents } from '../../utils/EventBus.js';

/** Maximum range (tiles) for the attack to connect. */
const ATTACK_RANGE = 1.2;

/**
 * Create an Attack state object for the enemy FSM.
 * @returns {{ name: string, enter: Function, update: Function, exit: Function }}
 */
export function createAttackState() {
    return {
        name: AI_STATES.ATTACK,

        /**
         * Begin attacking.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        enter(owner) {
            owner.alertLevel = 1.0;
            owner.attackTimer = 0; // ready to attack immediately

            gameEvents.emit('enemy:attacking', {
                type: owner.type,
                col: Math.round(owner.x),
                row: Math.round(owner.y),
            });
        },

        /**
         * Deal damage on cooldown; chase if player escapes range.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         * @param {number} dt
         */
        update(owner, dt) {
            if (!owner.playerRef) {
                owner.fsm.setState(AI_STATES.PATROL);
                return;
            }

            const dist = distance(owner.x, owner.y, owner.playerRef.x, owner.playerRef.y);

            // Player escaped attack range → chase
            if (dist > ATTACK_RANGE) {
                owner.lastKnownPlayerPos = { col: owner.playerRef.x, row: owner.playerRef.y };
                owner.fsm.setState(AI_STATES.CHASE);
                return;
            }

            // Face the player
            owner.facingAngle = Math.atan2(
                owner.playerRef.y - owner.y,
                owner.playerRef.x - owner.x
            );

            // Attack on cooldown
            owner.attackTimer += dt;
            const cooldown = owner.config.attackCooldown || 1500;
            if (owner.attackTimer >= cooldown) {
                owner.attackTimer = 0;

                gameEvents.emit('player:damaged', {
                    damage: owner.config.attackDamage || 1,
                    source: owner.type,
                    sourceCol: Math.round(owner.x),
                    sourceRow: Math.round(owner.y),
                });
            }
        },

        /**
         * Clean up attack timer.
         * @param {import('../../entities/enemies/Enemy.js').default} owner
         */
        exit(owner) {
            owner.attackTimer = 0;
        },
    };
}
