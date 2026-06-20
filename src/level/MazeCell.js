/**
 * MazeBreaker: Shadow Protocol — Maze Cell
 * Data class for a single cell in the maze grid.
 * Stores wall state, cell type, content reference, and fog-of-war status.
 */

export default class MazeCell {
    /**
     * @param {number} row - Grid row index
     * @param {number} col - Grid column index
     */
    constructor(row, col) {
        /** @type {number} Grid row */
        this.row = row;

        /** @type {number} Grid column */
        this.col = col;

        /**
         * Wall state for each side. true = wall present.
         * @type {{ top: boolean, right: boolean, bottom: boolean, left: boolean }}
         */
        this.walls = {
            top: true,
            right: true,
            bottom: true,
            left: true,
        };

        /**
         * Whether this cell has been visited during maze generation.
         * @type {boolean}
         */
        this.visited = false;

        /**
         * Semantic type of this cell.
         * @type {'empty' | 'entrance' | 'exit' | 'coin' | 'relic' | 'key'}
         */
        this.type = 'empty';

        /**
         * Reference to an entity or data object placed in this cell.
         * @type {*}
         */
        this.content = null;

        /**
         * Whether the player has revealed this cell (fog of war).
         * @type {boolean}
         */
        this.explored = false;
    }

    /**
     * Check if a wall exists on the given side.
     * @param {'top' | 'right' | 'bottom' | 'left'} direction
     * @returns {boolean}
     */
    hasWall(direction) {
        return this.walls[direction] === true;
    }

    /**
     * Remove a wall on the given side.
     * @param {'top' | 'right' | 'bottom' | 'left'} direction
     */
    removeWall(direction) {
        this.walls[direction] = false;
    }

    /**
     * Return an array of directions that have no wall (open passages).
     * @returns {string[]} e.g. ['top', 'right']
     */
    getOpenDirections() {
        const open = [];
        for (const [dir, hasWall] of Object.entries(this.walls)) {
            if (!hasWall) open.push(dir);
        }
        return open;
    }

    /**
     * Count the number of walls present.
     * @returns {number} 0-4
     */
    getWallCount() {
        let count = 0;
        if (this.walls.top) count++;
        if (this.walls.right) count++;
        if (this.walls.bottom) count++;
        if (this.walls.left) count++;
        return count;
    }

    /**
     * Check if this cell is a dead end (exactly 3 walls).
     * @returns {boolean}
     */
    isDeadEnd() {
        return this.getWallCount() === 3;
    }

    /**
     * Reset cell state for regeneration.
     */
    reset() {
        this.walls.top = true;
        this.walls.right = true;
        this.walls.bottom = true;
        this.walls.left = true;
        this.visited = false;
        this.type = 'empty';
        this.content = null;
        this.explored = false;
    }
}
