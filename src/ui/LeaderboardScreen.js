/**
 * MazeBreaker: Shadow Protocol — Leaderboard Screen
 * Displays the top 10 high scores from local save data.
 */

export default class LeaderboardScreen {
    /**
     * @param {object} saveManager - Handles persistent storage
     */
    constructor(saveManager) {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('leaderboard-screen');

        /** @type {HTMLElement|null} */
        this.list = document.getElementById('leaderboard-list');

        /** @type {object} */
        this.saveManager = saveManager;
    }

    /** Display the leaderboard and populate entries. */
    show() {
        if (this.el) this.el.classList.add('active');
        this.populateEntries();
    }

    /** Hide the leaderboard screen. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }

    /**
     * Populate the list with the top 10 high scores.
     * The first three entries receive gold, silver, and bronze borders.
     */
    populateEntries() {
        if (!this.list) return;

        const scores = this.saveManager?.getHighScores?.() ?? [];

        if (scores.length === 0) {
            this.list.innerHTML = `
                <div class="leaderboard-empty">
                    <p>No operation records yet.</p>
                    <p>Complete a sector to log your first entry.</p>
                </div>
            `;
            return;
        }

        const MEDAL_CLASSES = ['gold', 'silver', 'bronze'];

        this.list.innerHTML = scores.slice(0, 10).map((entry, i) => {
            const rank = i + 1;
            const medalClass = i < 3 ? MEDAL_CLASSES[i] : '';
            const dateStr = entry.date
                ? new Date(entry.date).toLocaleDateString()
                : '—';

            return `
                <div class="leaderboard-entry ${medalClass}">
                    <span class="entry-rank">#${rank}</span>
                    <span class="entry-level">Sector ${String(entry.level ?? 1).padStart(2, '0')}</span>
                    <span class="entry-score">${entry.score ?? 0}</span>
                    <span class="entry-date">${dateStr}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Add a new score entry to the leaderboard.
     * @param {object} data - { score, level, time, date }
     */
    addEntry(data) {
        if (this.saveManager?.saveHighScore) {
            this.saveManager.saveHighScore(data);
        }
    }
}
