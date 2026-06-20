/**
 * MazeBreaker: Shadow Protocol — Pathfinding System
 * BFS-based grid pathfinding with wall-phasing support and path caching.
 */

import { DIRECTIONS } from '../constants.js';

/** Maximum number of cached paths before eviction. */
const MAX_CACHE_SIZE = 128;

export default class PathfindingSystem {
    constructor() {
        /**
         * LRU-style path cache.
         * Key: "startCol,startRow>goalCol,goalRow:phase" → path array or null.
         * @type {Map<string, Array<{col:number,row:number}>|null>}
         */
        this._cache = new Map();
    }

    // ── Public API ──────────────────────────────────────────────

    /**
     * Find the shortest path between two grid cells using BFS.
     * @param {Array<Array<{walls:{top:boolean,right:boolean,bottom:boolean,left:boolean}}>>} grid
     *   2D array indexed [row][col]. Each cell has a `walls` object.
     * @param {{ col: number, row: number }} start
     * @param {{ col: number, row: number }} goal
     * @param {boolean} [canPhaseWalls=false] If true, ignore walls (Phantom).
     * @returns {Array<{col:number,row:number}>|null} Path from start→goal, or null.
     */
    findPath(grid, start, goal, canPhaseWalls = false) {
        // Bounds sanity
        const rows = grid.length;
        if (rows === 0) return null;
        const cols = grid[0].length;

        if (!this._inBounds(start.col, start.row, cols, rows) ||
            !this._inBounds(goal.col, goal.row, cols, rows)) {
            return null;
        }

        // Trivial case
        if (start.col === goal.col && start.row === goal.row) {
            return [{ col: start.col, row: start.row }];
        }

        // Cache lookup
        const cacheKey = `${start.col},${start.row}>${goal.col},${goal.row}:${canPhaseWalls ? 1 : 0}`;
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            // Move to end (most-recently used)
            this._cache.delete(cacheKey);
            this._cache.set(cacheKey, cached);
            return cached ? cached.map(n => ({ col: n.col, row: n.row })) : null;
        }

        // BFS with pointer-based queue for O(1) dequeue
        const queue = [{ col: start.col, row: start.row }];
        let head = 0;

        const visited = new Map();
        const startKey = `${start.col},${start.row}`;
        visited.set(startKey, null); // parent = null for start

        let found = false;

        while (head < queue.length) {
            const current = queue[head++];

            if (current.col === goal.col && current.row === goal.row) {
                found = true;
                break;
            }

            const neighbors = this.getNeighbors(grid, current.col, current.row, cols, rows, canPhaseWalls);

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                const nKey = `${n.col},${n.row}`;
                if (!visited.has(nKey)) {
                    visited.set(nKey, current);
                    queue.push(n);
                }
            }
        }

        let path = null;

        if (found) {
            // Reconstruct path from goal → start, then reverse
            path = [];
            let node = { col: goal.col, row: goal.row };
            while (node) {
                path.push({ col: node.col, row: node.row });
                const key = `${node.col},${node.row}`;
                node = visited.get(key);
            }
            path.reverse();
        }

        // Store in cache (evict oldest if needed)
        if (this._cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
        }
        this._cache.set(cacheKey, path);

        return path ? path.map(n => ({ col: n.col, row: n.row })) : null;
    }

    /**
     * Get walkable neighbors of a cell, respecting walls unless phasing.
     * @param {Array<Array>} grid
     * @param {number} col
     * @param {number} row
     * @param {number} cols - Grid width
     * @param {number} rows - Grid height
     * @param {boolean} canPhaseWalls
     * @returns {Array<{col:number,row:number}>}
     */
    getNeighbors(grid, col, row, cols, rows, canPhaseWalls) {
        const neighbors = [];
        const cell = grid[row][col];

        for (let i = 0; i < DIRECTIONS.length; i++) {
            const dir = DIRECTIONS[i];
            const nc = col + dir.dx;
            const nr = row + dir.dy;

            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

            if (canPhaseWalls) {
                // Phantom ignores walls entirely
                neighbors.push({ col: nc, row: nr });
            } else {
                // Check wall on current cell's side
                if (!cell.walls[dir.wall]) {
                    neighbors.push({ col: nc, row: nr });
                }
            }
        }

        return neighbors;
    }

    /**
     * Flush the entire path cache (e.g. on level change).
     */
    clearCache() {
        this._cache.clear();
    }

    // ── Internals ───────────────────────────────────────────────

    /**
     * @param {number} col
     * @param {number} row
     * @param {number} cols
     * @param {number} rows
     * @returns {boolean}
     */
    _inBounds(col, row, cols, rows) {
        return col >= 0 && col < cols && row >= 0 && row < rows;
    }
}
