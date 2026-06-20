/**
 * MazeBreaker: Shadow Protocol — Level Complete Screen
 * Displays star rating, rewards, and level statistics after clearing a sector.
 */

import { ECONOMY } from '../constants.js';

export default class LevelCompleteScreen {
    constructor() {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('level-complete');

        /** @type {HTMLElement|null} */
        this.starRating = document.getElementById('star-rating');

        /** @type {HTMLElement|null} */
        this.statsGrid = document.getElementById('level-stats');

        /** @type {HTMLElement|null} */
        this.rewardsSection = document.getElementById('rewards-section');

        /** @type {number[]} Timeout IDs for star animations */
        this._starTimers = [];
    }

    /**
     * Show the level-complete overlay with animated stars and reward breakdown.
     * @param {object} levelData
     * @param {number} levelData.level
     * @param {number} levelData.time - Completion time in seconds
     * @param {number} levelData.coins - Coins collected this level
     * @param {number} levelData.relics - Relics collected
     * @param {number} levelData.totalRelics - Total relics in the level
     * @param {boolean} levelData.wasStealthy - Never detected
     * @param {boolean} levelData.wasFast - Under par time
     * @param {boolean} levelData.noDamage - Zero damage taken
     * @param {number} levelData.score - Computed score
     */
    show(levelData = {}) {
        if (this.el) this.el.classList.add('active');

        const stars = this.calculateStars(levelData);
        this._renderStars(stars);
        this._populateStats(levelData);
        this._populateRewards(levelData, stars);
    }

    /** Hide the level-complete overlay and clear timers. */
    hide() {
        if (this.el) this.el.classList.remove('active');
        this._starTimers.forEach(id => clearTimeout(id));
        this._starTimers = [];
    }

    /**
     * Calculate star rating based on performance.
     * @param {object} levelData
     * @returns {number} 1-3
     */
    calculateStars(levelData) {
        let stars = 1; // Completing the level always earns 1 star

        // 2 stars: under time bonus AND all relics collected
        const allRelics = levelData.relics >= levelData.totalRelics;
        if (levelData.wasFast && allRelics) {
            stars = 2;
        }

        // 3 stars: stealth + no damage (implies 2-star conditions usually)
        if (levelData.wasStealthy && levelData.noDamage) {
            stars = 3;
        }

        return stars;
    }

    // ─── Stars ──────────────────────────────────────────────────

    /**
     * Render star icons with staggered animation.
     * @private
     * @param {number} count - 1 to 3
     */
    _renderStars(count) {
        if (!this.starRating) return;
        this.starRating.innerHTML = '';

        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = '★';
            star.style.opacity = '0.15';
            star.style.transform = 'scale(0.5)';
            star.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            star.style.display = 'inline-block';
            star.style.fontSize = '36px';
            star.style.margin = '0 6px';
            star.style.color = '#ffd700';
            this.starRating.appendChild(star);

            if (i < count) {
                const timer = setTimeout(() => {
                    star.style.opacity = '1';
                    star.style.transform = 'scale(1)';
                }, 300 + i * 350);
                this._starTimers.push(timer);
            }
        }
    }

    // ─── Stats ──────────────────────────────────────────────────

    /** @private */
    _populateStats(data) {
        if (!this.statsGrid) return;

        const mins = Math.floor((data.time ?? 0) / 60);
        const secs = Math.floor((data.time ?? 0) % 60);
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const items = [
            { label: 'Sector', value: String(data.level ?? 1).padStart(2, '0') },
            { label: 'Time', value: timeStr },
            { label: 'Coins', value: String(data.coins ?? 0) },
            { label: 'Relics', value: `${data.relics ?? 0}/${data.totalRelics ?? 0}` },
        ];

        this.statsGrid.innerHTML = items.map(item => `
            <div class="stat-item">
                <span class="stat-label">${item.label}</span>
                <span class="stat-value">${item.value}</span>
            </div>
        `).join('');
    }

    // ─── Rewards ────────────────────────────────────────────────

    /** @private */
    _populateRewards(data, stars) {
        if (!this.rewardsSection) return;

        const rewards = [];
        const coinValue = (data.coins ?? 0) * ECONOMY.COIN_VALUE;
        const relicValue = (data.relics ?? 0) * ECONOMY.RELIC_VALUE;
        const completeBonus = ECONOMY.LEVEL_COMPLETE_BONUS;

        rewards.push({ label: 'Coins', value: `+${coinValue}` });
        rewards.push({ label: 'Relics', value: `+${relicValue}` });
        rewards.push({ label: 'Completion', value: `+${completeBonus}` });

        if (data.wasStealthy) {
            rewards.push({ label: 'Stealth Bonus', value: `+${ECONOMY.STEALTH_BONUS}` });
        }
        if (data.wasFast) {
            rewards.push({ label: 'Speed Bonus', value: `+${ECONOMY.SPEED_BONUS}` });
        }
        if (data.noDamage) {
            rewards.push({ label: 'No Damage', value: `+${ECONOMY.NO_DAMAGE_BONUS}` });
        }

        const total = rewards.reduce((sum, r) => sum + parseInt(r.value), 0);

        this.rewardsSection.innerHTML = `
            <div class="rewards-list">
                ${rewards.map(r => `
                    <div class="reward-item">
                        <span class="reward-label">${r.label}</span>
                        <span class="reward-value">${r.value}</span>
                    </div>
                `).join('')}
                <div class="reward-item total">
                    <span class="reward-label">TOTAL</span>
                    <span class="reward-value">${total}</span>
                </div>
            </div>
        `;
    }
}
