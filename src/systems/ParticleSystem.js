/**
 * MazeBreaker: Shadow Protocol — Particle System
 * Object-pooled particle effects for visual feedback.
 * Supports preset emission types and custom configurations.
 * Renders in camera space with alpha fade-out based on lifetime.
 */

import { PARTICLES } from '../constants.js';
import ObjectPool from '../utils/ObjectPool.js';
import { randomRange } from '../utils/MathUtils.js';

/**
 * Factory function for creating a blank particle.
 * @returns {Object}
 */
const particleFactory = () => ({
    x: 0, y: 0,
    vx: 0, vy: 0,
    life: 0, maxLife: 0,
    size: 1,
    color: '#fff',
    alpha: 1,
    gravity: 0,
});

/**
 * Reset function to return a particle to its default state.
 * @param {Object} p
 */
const particleReset = (p) => {
    p.x = 0; p.y = 0;
    p.vx = 0; p.vy = 0;
    p.life = 0; p.maxLife = 0;
    p.size = 1;
    p.color = '#fff';
    p.alpha = 1;
    p.gravity = 0;
};

export default class ParticleSystem {
    constructor() {
        /** @type {ObjectPool} Pre-allocated particle pool */
        this._pool = new ObjectPool(
            particleFactory,
            particleReset,
            PARTICLES.MAX_PARTICLES
        );
    }

    /**
     * Update all active particles.
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        const dtSec = dt / 1000;
        const toRelease = [];

        this._pool.forEach((p) => {
            // Update position
            p.x += p.vx * dtSec;
            p.y += p.vy * dtSec;

            // Apply gravity
            p.vy += p.gravity * dt;

            // Decrease lifetime
            p.life -= dt;

            // Fade alpha based on remaining life
            p.alpha = p.maxLife > 0 ? Math.max(0, p.life / p.maxLife) : 0;

            // Mark dead particles for release
            if (p.life <= 0) {
                toRelease.push(p);
            }
        });

        // Release dead particles
        for (const p of toRelease) {
            this._pool.release(p);
        }
    }

    /**
     * Render all active particles to the canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} camera - Camera with x, y offset
     */
    render(ctx, camera) {
        const camX = camera?.x ?? 0;
        const camY = camera?.y ?? 0;

        // Batch particles by color for fewer state changes
        /** @type {Map<string, Array>} */
        const batches = new Map();

        this._pool.forEach((p) => {
            if (p.alpha <= 0) return;
            if (!batches.has(p.color)) batches.set(p.color, []);
            batches.get(p.color).push(p);
        });

        ctx.save();

        for (const [color, particles] of batches) {
            for (const p of particles) {
                const sx = p.x - camX;
                const sy = p.y - camY;

                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = color;

                if (p.size <= 2) {
                    // Small particles: fast rect draw
                    ctx.fillRect(
                        sx - p.size / 2,
                        sy - p.size / 2,
                        p.size,
                        p.size
                    );
                } else {
                    // Larger particles: circle draw
                    ctx.beginPath();
                    ctx.arc(sx, sy, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Emit particles of a preset type at a world position.
     * @param {string} type - Preset type: 'coinBurst', 'damageBurst', 'abilityRing', 'ambient', 'trail'
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {Object} [overrides] - Optional overrides (e.g., { color } for abilityRing)
     */
    emit(type, x, y, overrides) {
        switch (type) {
            case 'coinBurst':
                this._emitPreset(x, y, PARTICLES.COIN_BURST, overrides);
                break;

            case 'damageBurst':
                this._emitPreset(x, y, PARTICLES.DAMAGE_BURST, overrides);
                break;

            case 'abilityRing':
                this._emitRing(x, y, overrides);
                break;

            case 'ambient':
                this._emitPreset(x, y, PARTICLES.AMBIENT, overrides);
                break;

            case 'trail':
                this._emitTrail(x, y, overrides);
                break;

            default:
                break;
        }
    }

    /**
     * Spawn particles from a preset configuration.
     * @param {number} x
     * @param {number} y
     * @param {Object} preset
     * @param {Object} [overrides]
     */
    _emitPreset(x, y, preset, overrides) {
        const count = overrides?.count ?? preset.count;
        const speed = overrides?.speed ?? preset.speed;
        const life = overrides?.life ?? preset.life;
        const size = overrides?.size ?? preset.size;
        const color = overrides?.color ?? preset.color;
        const gravity = overrides?.gravity ?? preset.gravity;

        for (let i = 0; i < count; i++) {
            const p = this._pool.acquire();
            if (!p) return; // Pool exhausted

            const angle = randomRange(0, Math.PI * 2);
            const spd = randomRange(speed * 0.5, speed);

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd * 60; // Convert to pixels/sec
            p.vy = Math.sin(angle) * spd * 60;
            p.life = life + randomRange(-life * 0.2, life * 0.2);
            p.maxLife = p.life;
            p.size = size + randomRange(-0.5, 0.5);
            p.color = color;
            p.alpha = 1;
            p.gravity = gravity;
        }
    }

    /**
     * Emit a ring of particles expanding outward (for abilities).
     * @param {number} x
     * @param {number} y
     * @param {Object} [overrides]
     */
    _emitRing(x, y, overrides) {
        const preset = PARTICLES.ABILITY_RING;
        const count = overrides?.count ?? preset.count;
        const speed = overrides?.speed ?? preset.speed;
        const life = overrides?.life ?? preset.life;
        const size = overrides?.size ?? preset.size;
        const color = overrides?.color ?? '#00f0ff';
        const gravity = overrides?.gravity ?? preset.gravity;

        for (let i = 0; i < count; i++) {
            const p = this._pool.acquire();
            if (!p) return;

            // Evenly distributed around a ring
            const angle = (i / count) * Math.PI * 2;
            const spd = speed * 60;

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = life;
            p.maxLife = life;
            p.size = size;
            p.color = color;
            p.alpha = 1;
            p.gravity = gravity;
        }
    }

    /**
     * Emit a small trail particle behind a moving entity.
     * @param {number} x
     * @param {number} y
     * @param {Object} [overrides]
     */
    _emitTrail(x, y, overrides) {
        const p = this._pool.acquire();
        if (!p) return;

        p.x = x + randomRange(-2, 2);
        p.y = y + randomRange(-2, 2);
        p.vx = randomRange(-10, 10);
        p.vy = randomRange(-10, 10);
        p.life = overrides?.life ?? 300;
        p.maxLife = p.life;
        p.size = overrides?.size ?? 1.5;
        p.color = overrides?.color ?? '#00f0ff44';
        p.alpha = 1;
        p.gravity = overrides?.gravity ?? 0;
    }

    /**
     * Spawn custom particles with a full config object.
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} count - Number of particles
     * @param {Object} config - { speed, life, size, color, gravity, spread }
     */
    emitCustom(x, y, count, config) {
        const speed = config.speed ?? 1;
        const life = config.life ?? 500;
        const size = config.size ?? 2;
        const color = config.color ?? '#fff';
        const gravity = config.gravity ?? 0;
        const spread = config.spread ?? Math.PI * 2;
        const baseAngle = config.angle ?? 0;

        for (let i = 0; i < count; i++) {
            const p = this._pool.acquire();
            if (!p) return;

            const angle = baseAngle + randomRange(-spread / 2, spread / 2);
            const spd = randomRange(speed * 0.5, speed) * 60;

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = life + randomRange(-life * 0.15, life * 0.15);
            p.maxLife = p.life;
            p.size = size;
            p.color = color;
            p.alpha = 1;
            p.gravity = gravity;
        }
    }

    /**
     * Release all active particles.
     */
    clear() {
        this._pool.releaseAll();
    }

    /** Number of currently active particles */
    get activeCount() {
        return this._pool.activeCount;
    }
}
