/**
 * MazeBreaker: Shadow Protocol — Maze Generator
 * Procedural maze generation using iterative Recursive Backtracking
 * (explicit stack, no recursion). Includes post-processing for
 * multiple paths and collectible placement.
 */

import { MAZE, LEVEL, DIRECTIONS, TILE_SIZE } from '../constants.js';
import { randomInt, shuffle } from '../utils/MathUtils.js';
import MazeCell from './MazeCell.js';
import { clamp } from '../utils/MathUtils.js';

export default class MazeGenerator {
    constructor() {
        // Stateless — all data flows through generate()
    }

    /**
     * Generate a complete maze for the given level.
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @param {number} [level=1] - Current game level (affects collectible counts)
     * @returns {{
     *   grid: MazeCell[][],
     *   entrance: {col: number, row: number},
     *   exit: {col: number, row: number},
     *   coinPositions: {col: number, row: number}[],
     *   relicPositions: {col: number, row: number}[],
     *   keyPositions: {col: number, row: number}[]
     * }}
     */
    generate(cols, rows, level = 1) {
        // 1. Create grid of MazeCells
        const grid = this._createGrid(rows, cols);

        // 2. Carve passages with iterative backtracking
        this._carvePassages(grid, cols, rows);

        // 3. Remove extra walls to create multiple paths
        this._removeExtraWalls(grid, cols, rows);

        // 4. Place entrance and exit
        const entrance = this._placeEntrance(grid, rows);
        const exit = this._placeExit(grid, cols, rows);

        // 5. Place collectibles
        const coinCount = Math.floor(LEVEL.BASE_COINS + level * LEVEL.COINS_PER_LEVEL);
        const relicCount = Math.floor(LEVEL.BASE_RELICS + level * LEVEL.RELICS_PER_LEVEL);

        const deadEnds = this._getDeadEnds(grid, cols, rows);
        const intersections = this._getIntersections(grid, cols, rows);

        // Merge candidates, excluding entrance/exit
        const candidates = [...deadEnds, ...intersections].filter(
            (c) =>
                !(c.col === entrance.col && c.row === entrance.row) &&
                !(c.col === exit.col && c.row === exit.row)
        );
        shuffle(candidates);

        const relicPositions = this._placeCollectibles(grid, candidates, 'relic', relicCount);
        const coinPositions = this._placeCollectibles(grid, candidates, 'coin', coinCount);

        // Keys: one per level after level 3 (future gate mechanic)
        const keyCount = level >= 4 ? 1 : 0;
        const keyPositions = this._placeCollectibles(grid, candidates, 'key', keyCount);

        return { grid, entrance, exit, coinPositions, relicPositions, keyPositions };
    }

    /**
     * Calculate maze dimensions for a given level.
     * @param {number} level
     * @returns {{cols: number, rows: number}}
     */
    getMazeSize(level) {
        const cols = clamp(
            MAZE.MIN_COLS + (level - 1) * MAZE.GROWTH_COLS,
            MAZE.MIN_COLS,
            MAZE.MAX_COLS
        );
        const rows = clamp(
            MAZE.MIN_ROWS + (level - 1) * MAZE.GROWTH_ROWS,
            MAZE.MIN_ROWS,
            MAZE.MAX_ROWS
        );
        return { cols, rows };
    }

    // ──────────────────────────────────────────────────────────
    //  Grid creation
    // ──────────────────────────────────────────────────────────

    /**
     * Create a 2D array of MazeCells: grid[row][col].
     * @private
     */
    _createGrid(rows, cols) {
        const grid = [];
        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c < cols; c++) {
                grid[r][c] = new MazeCell(r, c);
            }
        }
        return grid;
    }

    // ──────────────────────────────────────────────────────────
    //  Iterative Recursive Backtracking
    // ──────────────────────────────────────────────────────────

    /**
     * Carve passages using an explicit stack (no recursion).
     * @private
     */
    _carvePassages(grid, cols, rows) {
        const start = grid[0][0];
        start.visited = true;

        const stack = [start];

        while (stack.length > 0) {
            const current = stack[stack.length - 1]; // peek
            const neighbors = this._getUnvisitedNeighbors(current, grid, cols, rows);

            if (neighbors.length > 0) {
                // Pick a random unvisited neighbor
                const next = neighbors[randomInt(0, neighbors.length - 1)];
                this._removeWallsBetween(current, next);
                next.visited = true;
                stack.push(next);
            } else {
                // Backtrack
                stack.pop();
            }
        }
    }

    /**
     * Get unvisited neighbors of a cell.
     * @param {MazeCell} cell
     * @param {MazeCell[][]} grid
     * @param {number} cols
     * @param {number} rows
     * @returns {MazeCell[]}
     * @private
     */
    _getUnvisitedNeighbors(cell, grid, cols, rows) {
        const neighbors = [];
        for (const dir of DIRECTIONS) {
            const nr = cell.row + dir.dy;
            const nc = cell.col + dir.dx;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
                neighbors.push(grid[nr][nc]);
            }
        }
        return neighbors;
    }

    /**
     * Remove the shared wall between two adjacent cells.
     * @param {MazeCell} current
     * @param {MazeCell} next
     * @private
     */
    _removeWallsBetween(current, next) {
        const dc = next.col - current.col;
        const dr = next.row - current.row;

        for (const dir of DIRECTIONS) {
            if (dir.dx === dc && dir.dy === dr) {
                current.removeWall(dir.wall);
                next.removeWall(dir.opposite);
                return;
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Post-processing: multiple paths
    // ──────────────────────────────────────────────────────────

    /**
     * Remove a fraction of internal walls to create loops / alternate routes.
     * @private
     */
    _removeExtraWalls(grid, cols, rows) {
        const internalWalls = [];

        // Collect all internal walls that are still standing
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                // Only check right and bottom to avoid duplicates
                if (c < cols - 1 && cell.hasWall('right')) {
                    internalWalls.push({ cell, neighbor: grid[r][c + 1], wall: 'right', opposite: 'left' });
                }
                if (r < rows - 1 && cell.hasWall('bottom')) {
                    internalWalls.push({ cell, neighbor: grid[r + 1][c], wall: 'bottom', opposite: 'top' });
                }
            }
        }

        shuffle(internalWalls);
        const removeCount = Math.floor(internalWalls.length * MAZE.WALL_REMOVAL_RATE);

        for (let i = 0; i < removeCount && i < internalWalls.length; i++) {
            const { cell, neighbor, wall, opposite } = internalWalls[i];
            cell.removeWall(wall);
            neighbor.removeWall(opposite);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Entrance / Exit placement
    // ──────────────────────────────────────────────────────────

    /**
     * Place the entrance on the left edge (col 0).
     * @private
     */
    _placeEntrance(grid, rows) {
        const row = randomInt(0, rows - 1);
        const cell = grid[row][0];
        cell.type = 'entrance';
        cell.removeWall('left'); // open the outer wall
        return { col: 0, row };
    }

    /**
     * Place the exit on the right edge (last col).
     * @private
     */
    _placeExit(grid, cols, rows) {
        const row = randomInt(0, rows - 1);
        const cell = grid[row][cols - 1];
        cell.type = 'exit';
        cell.removeWall('right'); // open the outer wall
        return { col: cols - 1, row };
    }

    // ──────────────────────────────────────────────────────────
    //  Collectible helpers
    // ──────────────────────────────────────────────────────────

    /**
     * Find all dead-end cells (exactly 3 walls).
     * @private
     */
    _getDeadEnds(grid, cols, rows) {
        const results = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].isDeadEnd()) {
                    results.push({ col: c, row: r });
                }
            }
        }
        return results;
    }

    /**
     * Find cells with 0 or 1 wall (intersections / open areas).
     * @private
     */
    _getIntersections(grid, cols, rows) {
        const results = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].getWallCount() <= 1) {
                    results.push({ col: c, row: r });
                }
            }
        }
        return results;
    }

    /**
     * Place collectibles of a given type into available candidate cells.
     * @param {MazeCell[][]} grid
     * @param {{col: number, row: number}[]} candidates - Mutable list, used cells are removed
     * @param {string} type
     * @param {number} count
     * @returns {{col: number, row: number}[]}
     * @private
     */
    _placeCollectibles(grid, candidates, type, count) {
        const placed = [];
        let i = 0;

        while (placed.length < count && candidates.length > 0) {
            const pos = candidates.shift();
            const cell = grid[pos.row][pos.col];
            if (cell.type !== 'empty') continue; // skip if already assigned

            cell.type = type;
            placed.push({ col: pos.col, row: pos.row });
            i++;
        }

        return placed;
    }
}
