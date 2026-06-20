/**
 * MazeBreaker: Shadow Protocol — Achievement Screen
 * Gallery view of all achievements with unlock status.
 */

import { ACHIEVEMENTS } from '../constants.js';

export default class AchievementScreen {
    /**
     * @param {object} achievementManager - Tracks unlocked achievements
     */
    constructor(achievementManager) {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('achievements-screen');

        /** @type {HTMLElement|null} */
        this.grid = document.getElementById('achievement-grid');

        /** @type {object} */
        this.manager = achievementManager;
    }

    /** Display the achievements screen and populate the card grid. */
    show() {
        if (this.el) this.el.classList.add('active');
        this.populateGrid();
    }

    /** Hide the achievements screen. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }

    /**
     * Create achievement cards from the ACHIEVEMENTS constant.
     * Unlocked cards show in full colour; locked cards are greyed out.
     */
    populateGrid() {
        if (!this.grid) return;

        this.grid.innerHTML = ACHIEVEMENTS.map(achievement => {
            const unlocked = this.manager?.isUnlocked(achievement.id) ?? false;
            const stateClass = unlocked ? 'unlocked' : 'locked';

            return `
                <div class="achievement-card ${stateClass}">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-info">
                        <span class="achievement-name">${achievement.name}</span>
                        <span class="achievement-desc">${achievement.desc}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get the count of unlocked achievements.
     * @returns {number}
     */
    getUnlockCount() {
        return this.manager?.getUnlockedCount?.() ?? 0;
    }
}
