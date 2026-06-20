/**
 * MazeBreaker: Shadow Protocol — Game Over Screen
 * Displays end-of-run statistics after the player is defeated.
 */

export default class GameOverScreen {
    constructor() {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('gameover-screen');

        /** @type {HTMLElement|null} */
        this.statsGrid = document.getElementById('gameover-stats');
    }

    /**
     * Show the game-over overlay and populate stats.
     * @param {object} stats
     * @param {number} stats.level - Level reached
     * @param {number} stats.time - Time survived in seconds
     * @param {number} stats.coins - Coins collected
     * @param {number} stats.relics - Relics found
     * @param {number} stats.enemiesAvoided - Enemies successfully avoided
     * @param {string} stats.cause - Cause of defeat
     */
    show(stats = {}) {
        if (this.el) this.el.classList.add('active');
        this._populateStats(stats);
    }

    /** Hide the game-over overlay. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }

    /**
     * Populate the stats grid with run results.
     * @private
     * @param {object} stats
     */
    _populateStats(stats) {
        if (!this.statsGrid) return;

        const mins = Math.floor((stats.time ?? 0) / 60);
        const secs = Math.floor((stats.time ?? 0) % 60);
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const items = [
            { label: 'Level Reached', value: `Sector ${String(stats.level ?? 1).padStart(2, '0')}` },
            { label: 'Time Survived', value: timeStr },
            { label: 'Coins Collected', value: String(stats.coins ?? 0) },
            { label: 'Relics Found', value: String(stats.relics ?? 0) },
        ];

        this.statsGrid.innerHTML = items.map(item => `
            <div class="stat-item">
                <span class="stat-label">${item.label}</span>
                <span class="stat-value">${item.value}</span>
            </div>
        `).join('');
    }
}
