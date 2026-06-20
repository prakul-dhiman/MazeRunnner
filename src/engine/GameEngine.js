/**
 * MazeBreaker: Shadow Protocol — Game Engine
 * Core orchestrator: fixed-timestep game loop, state management,
 * and coordination of all sub-systems.
 */

import { FIXED_DT, GAME_STATES, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';
import InputManager from './InputManager.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Player from '../entities/Player.js';
import PlayerController from '../entities/PlayerController.js';
import ScoutUnit from '../entities/enemies/ScoutUnit.js';
import HunterUnit from '../entities/enemies/HunterUnit.js';
import PhantomUnit from '../entities/enemies/PhantomUnit.js';
import SentinelUnit from '../entities/enemies/SentinelUnit.js';

/**
 * Map GAME_STATES values to their corresponding HTML overlay element IDs.
 * Only states that own a UI screen are listed.
 */
const STATE_SCREEN_MAP = {
    [GAME_STATES.MENU]: 'main-menu',
    [GAME_STATES.PAUSED]: 'pause-menu',
    [GAME_STATES.SETTINGS]: 'settings-menu',
    [GAME_STATES.GAME_OVER]: 'gameover-screen',
    [GAME_STATES.LEVEL_COMPLETE]: 'level-complete',
    [GAME_STATES.SHOP]: 'shop-screen',
    [GAME_STATES.ACHIEVEMENTS]: 'achievements-screen',
    [GAME_STATES.LEADERBOARD]: 'leaderboard-screen',
};

export default class GameEngine {
    constructor() {
        // ── Core subsystems ──────────────────────────────────
        /** @type {InputManager} */
        this.inputManager = new InputManager();

        /** @type {Camera} */
        this.camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);

        /** @type {Renderer} */
        this.renderer = new Renderer();

        // ── State ────────────────────────────────────────────
        /** @type {string} Current game state from GAME_STATES */
        this.state = GAME_STATES.MENU;

        /** @type {string|null} Previous state (for returning from overlays) */
        this._previousState = null;

        /** @type {number} Current level number (1-based) */
        this.level = 1;

        // ── Loop timing ──────────────────────────────────────
        /** @type {number} Accumulator for fixed-timestep updates */
        this._accumulator = 0;

        /** @type {number} Timestamp of last frame */
        this._lastTime = 0;

        /** @type {number} requestAnimationFrame handle */
        this._rafId = 0;

        /** @type {boolean} Whether the loop is running */
        this._running = false;

        // ── Plug-in system references (set externally) ───────
        /** @type {import('../level/LevelManager.js').default | null} */
        this.levelManager = null;

        /** @type {import('../entities/Player.js').default | null} */
        this.player = null;

        /** @type {import('../entities/PlayerController.js').default | null} */
        this.playerController = null;

        /** @type {Array} Active enemy instances */
        this.enemies = [];

        /** @type {*} Fog-of-war system */
        this.fogSystem = null;

        /** @type {*} Stealth / detection system */
        this.stealthSystem = null;

        /** @type {*} Particle system */
        this.particleSystem = null;

        /** @type {*} Ability system */
        this.abilitySystem = null;

        /** @type {*} HUD renderer */
        this.hud = null;

        /** @type {import('../level/TileRenderer.js').default | null} */
        this.tileRenderer = null;

        /** @type {*} Save manager reference */
        this.saveManager = null;

        /** @type {*} Inventory system reference */
        this.inventorySystem = null;

        /** @type {*} Progression system reference */
        this.progressionSystem = null;

        /** @type {*} Economy system reference */
        this.economySystem = null;

        /** @type {*} Achievement manager reference */
        this.achievementManager = null;

        /** Global elapsed time in ms (for animation) */
        this.elapsedTime = 0;
    }

    // ──────────────────────────────────────────────────────────
    //  Lifecycle
    // ──────────────────────────────────────────────────────────

    /**
     * One-time initialisation. Call after all sub-systems have been assigned.
     */
    init() {
        this._showScreenForState(this.state);
        gameEvents.emit('game:init', { engine: this });
    }

    /**
     * Generate and load a level: spawn player, enemies, reset systems.
     * @param {number} levelNum
     */
    initLevel(levelNum) {
        if (!this.levelManager) return;

        // 1. Generate and load the maze level
        this.levelManager.loadLevel(levelNum);
        const levelData = this.levelManager.getLevelData();

        // 2. Spawn/Reset player at entrance
        const entrance = levelData.entrance;
        const startX = entrance.col + 0.5;
        const startY = entrance.row + 0.5;

        if (!this.player) {
            this.player = new Player(startX, startY);
            this.playerController = new PlayerController(this.player, this.inputManager);
        } else {
            this.player.active = true;
            this.player.hp = this.player.maxHp;
            this.player.stamina = this.player.maxStamina;
            this.player.isVisible = true;
            this.player.isCloaked = false;
            this.player.detected = false;
            this.player.damageTaken = 0;
            this.player.abilitiesUsed = 0;
            this.player.setGridPosition(startX, startY);
        }

        // Apply upgrades to player
        if (this.economySystem) {
            this.economySystem.applyUpgrades(this.player);
            // Refresh current health to max if upgraded
            this.player.hp = this.player.maxHp;
        }

        // 3. Spawn enemies
        this.enemies = [];
        const enemySpawns = this.levelManager.getEnemySpawns(levelNum, levelData.grid);
        for (const spawn of enemySpawns) {
            let enemy;
            switch (spawn.type) {
                case 'scout':
                    enemy = new ScoutUnit(spawn.col, spawn.row, levelData.grid);
                    break;
                case 'hunter':
                    enemy = new HunterUnit(spawn.col, spawn.row, levelData.grid);
                    break;
                case 'phantom':
                    enemy = new PhantomUnit(spawn.col, spawn.row, levelData.grid);
                    break;
                case 'sentinel':
                    enemy = new SentinelUnit(spawn.col, spawn.row, levelData.grid);
                    break;
                default:
                    continue;
            }
            enemy.playerRef = this.player;
            this.enemies.push(enemy);
        }

        // 4. Initialize fog of war
        if (this.fogSystem) {
            this.fogSystem.init(levelData.cols, levelData.rows);
            // First tick to reveal entrance area
            const playerCol = Math.floor(this.player.x);
            const playerRow = Math.floor(this.player.y);
            const visionRadius = this.player.visionRadius ?? 5;
            this.fogSystem.update(playerCol, playerRow, visionRadius, levelData.grid);
        }

        // 5. Initialize ability system
        if (this.abilitySystem) {
            this.abilitySystem.init();
            
            // Apply upgrade multipliers to ability system
            if (this.economySystem) {
                const cooldownMult = this.economySystem.getEffect('cooldown');
                const durationMult = this.economySystem.getEffect('abilityDuration');
                this.abilitySystem.applyCooldownMultiplier(cooldownMult);
                this.abilitySystem.applyDurationMultiplier(durationMult);
            }
        }

        // 6. Reset particles
        if (this.particleSystem) {
            this.particleSystem.clear();
        }

        // 7. Reset camera
        this.camera.x = startX * TILE_SIZE - CANVAS_WIDTH / 2;
        this.camera.y = startY * TILE_SIZE - CANVAS_HEIGHT / 2;
        this.camera.clampToBounds(levelData.cols * TILE_SIZE, levelData.rows * TILE_SIZE);

        gameEvents.emit('level:started', { level: levelNum });
    }

    /** Start a brand new run */
    startNewGame() {
        this.level = 1;

        // Reset progression and economy
        if (this.progressionSystem) this.progressionSystem.reset();
        if (this.inventorySystem) {
            this.inventorySystem.coins = 0;
            this.inventorySystem.totalCoins = 0;
            this.inventorySystem.resetLevelItems();
        }
        if (this.economySystem) this.economySystem.init([]);

        this.initLevel(this.level);
        this.setState(GAME_STATES.PLAYING);
        this.start();
    }

    /** Continue game from save file */
    continueSavedGame() {
        if (!this.saveManager) {
            this.startNewGame();
            return;
        }

        const saveData = this.saveManager.load();
        if (!saveData) {
            this.startNewGame();
            return;
        }

        this.level = saveData.currentLevel ?? 1;

        if (this.inventorySystem) {
            this.inventorySystem.coins = saveData.coins ?? 0;
            this.inventorySystem.totalCoins = saveData.totalCoins ?? 0;
            this.inventorySystem.resetLevelItems();
        }

        if (this.economySystem) {
            this.economySystem.init(saveData.upgrades ?? []);
        }

        if (this.achievementManager && saveData.achievements) {
            this.achievementManager.init(saveData.achievements);
        }

        this.initLevel(this.level);
        this.setState(GAME_STATES.PLAYING);
        this.start();
    }

    /** Go to the next level */
    loadNextLevel() {
        this.level++;
        if (this.level > 25) {
            // Endless mode or reset to 1
            this.level = 1;
        }

        if (this.inventorySystem) {
            this.inventorySystem.resetLevelItems();
        }

        this.initLevel(this.level);
        this.setState(GAME_STATES.PLAYING);
    }

    /**
     * Start the main game loop.
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = performance.now();
        this._rafId = requestAnimationFrame(this._gameLoop.bind(this));
    }

    /**
     * Stop the main game loop.
     */
    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Game Loop (fixed timestep with accumulator)
    // ──────────────────────────────────────────────────────────

    /**
     * @param {DOMHighResTimeStamp} currentTime
     * @private
     */
    _gameLoop(currentTime) {
        if (!this._running) return;

        const frameTime = currentTime - this._lastTime;
        this._lastTime = currentTime;

        // Guard against spiral of death: cap at 5 fixed updates per frame
        this._accumulator += Math.min(frameTime, FIXED_DT * 5);

        while (this._accumulator >= FIXED_DT) {
            this._update(FIXED_DT);
            this._accumulator -= FIXED_DT;
        }

        this._render();

        // Clear per-frame input state AFTER update + render
        this.inputManager.update();

        this._rafId = requestAnimationFrame(this._gameLoop.bind(this));
    }

    // ──────────────────────────────────────────────────────────
    //  Update (called at fixed timestep)
    // ──────────────────────────────────────────────────────────

    /**
     * @param {number} dt - Fixed delta in ms (FIXED_DT)
     * @private
     */
    _update(dt) {
        this.elapsedTime += dt;

        switch (this.state) {
            case GAME_STATES.PLAYING:
                this._updatePlaying(dt);
                break;

            case GAME_STATES.PAUSED:
                // Check for un-pause
                if (this.inputManager.isAnyKeyPressed(['Escape'])) {
                    this.setState(GAME_STATES.PLAYING);
                }
                break;

            case GAME_STATES.MENU:
            case GAME_STATES.GAME_OVER:
            case GAME_STATES.LEVEL_COMPLETE:
            case GAME_STATES.SHOP:
            case GAME_STATES.ACHIEVEMENTS:
            case GAME_STATES.LEADERBOARD:
            case GAME_STATES.SETTINGS:
                // UI-driven screens — no per-tick logic
                break;
        }
    }

    _updatePlaying(dt) {
        // Pause toggle
        if (this.inputManager.isAnyKeyPressed(['Escape'])) {
            this.setState(GAME_STATES.PAUSED);
            return;
        }

        // Player movement
        if (this.playerController && this.levelManager) {
            const { grid, cols, rows } = this.levelManager.getLevelData();
            this.playerController.update(dt, grid, cols, rows);
        }

        // Player timers (invulnerability, etc.)
        if (this.player) {
            this.player.update(dt);
        }

        // Camera follow
        if (this.player) {
            this.camera.follow(this.player, dt);
            if (this.levelManager) {
                const { cols, rows } = this.levelManager.getLevelData();
                this.camera.clampToBounds(cols * TILE_SIZE, rows * TILE_SIZE);
            }
        }
        this.camera.update(dt);

        // Enemies
        const playerPos = this.player ? { col: Math.floor(this.player.x), row: Math.floor(this.player.y) } : null;
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].active) {
                this.enemies[i].update(dt, playerPos);
            }
        }

        // Stealth / detection
        if (this.stealthSystem && this.player && this.levelManager) {
            const { grid } = this.levelManager.getLevelData();
            this.stealthSystem.update(dt, this.player, this.enemies, grid);
            
            // Check overall detection for HUD edge glow
            let detected = false;
            let maxMeter = 0;
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                if (enemy.active && !enemy.disabled) {
                    const meter = this.stealthSystem.getDetectionMeter(enemy.id ?? i);
                    if (meter > maxMeter) maxMeter = meter;
                    if (meter >= 1.0) detected = true;
                }
            }
            this.player.detected = detected || maxMeter > 0.3;
            this.player.detectionIntensity = maxMeter;
        }

        // Level manager (collectibles, win condition)
        if (this.levelManager) {
            this.levelManager.update(dt);
            if (this.player) {
                this.levelManager.checkCollisions(this.player);
                if (this.levelManager.isLevelComplete(this.player)) {
                    this.setState(GAME_STATES.LEVEL_COMPLETE);
                }
            }
        }

        // Fog of war
        if (this.fogSystem && this.player && this.levelManager) {
            const { grid } = this.levelManager.getLevelData();
            const playerCol = Math.floor(this.player.x);
            const playerRow = Math.floor(this.player.y);
            const visionRadius = this.player.visionRadius ?? 5;
            this.fogSystem.update(playerCol, playerRow, visionRadius, grid);
        }

        // Abilities
        if (this.abilitySystem && this.player) {
            this.abilitySystem.update(dt, this.player, this.enemies, this);
        }

        // Particles
        if (this.particleSystem) {
            this.particleSystem.update(dt);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Render
    // ──────────────────────────────────────────────────────────

    /** @private */
    _render() {
        switch (this.state) {
            case GAME_STATES.PLAYING:
            case GAME_STATES.PAUSED:
                this._renderGameplay();
                break;

            // Other states are HTML-overlay driven; we may still
            // want a background render for visual polish
            default:
                break;
        }
    }

    /**
     * Render all gameplay layers.
     * @private
     */
    _renderGameplay() {
        // Background layer — maze tiles
        this.renderer.clear('bg');
        if (this.tileRenderer && this.levelManager) {
            const { grid, cols, rows } = this.levelManager.getLevelData();
            this.tileRenderer.renderMaze(grid, cols, rows, this.camera);
        }

        // Game layer — entities
        this.renderer.clear('game');
        const gameCtx = this.renderer.game;

        // Collectibles are rendered by TileRenderer on the bg layer,
        // so we skip them here. Enemies first, then player on top.
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].active) {
                this.enemies[i].render(gameCtx, this.camera);
            }
        }

        if (this.player && this.player.active) {
            this.player.render(gameCtx, this.camera);
        }

        // Particles overlay on game layer
        if (this.particleSystem) {
            this.particleSystem.render(gameCtx, this.camera);
        }

        // Fog layer
        this.renderer.clear('fog');
        if (this.fogSystem) {
            this.fogSystem.render(this.camera);
        }

        // UI layer — HUD
        this.renderer.clear('ui');
        if (this.hud && this.player && this.abilitySystem && this.inventorySystem && this.levelManager) {
            const levelData = this.levelManager.getLevelData();
            
            // Construct a 2D representation of the 1D fog grid for the HUD minimap
            const fog2D = [];
            if (this.fogSystem && this.fogSystem._grid) {
                const cols = this.fogSystem._cols;
                const rows = this.fogSystem._rows;
                const rawGrid = this.fogSystem._grid;
                for (let r = 0; r < rows; r++) {
                    const row = [];
                    for (let c = 0; c < cols; c++) {
                        row.push(rawGrid[r * cols + c]);
                    }
                    fog2D.push(row);
                }
            }

            this.hud.render(
                this.player,
                this.abilitySystem.getAllStates(),
                {
                    coins: this.inventorySystem.coins,
                    relics: this.inventorySystem.relics,
                    totalRelics: this.inventorySystem.relicsRequired,
                },
                {
                    level: this.level,
                    minimapUnlocked: this.player.hasMinimap || false,
                },
                this.levelManager.timeElapsed / 1000,
                this.enemies,
                levelData.grid,
                fog2D
            );
        }
    }

    // ──────────────────────────────────────────────────────────
    //  State Management
    // ──────────────────────────────────────────────────────────

    /**
     * Transition to a new game state.
     * @param {string} newState - One of GAME_STATES values
     */
    setState(newState) {
        if (newState === this.state) return;

        const oldState = this.state;
        this._previousState = oldState;
        this.state = newState;

        // Hide old screen, show new screen
        this._hideScreenForState(oldState);
        this._showScreenForState(newState);

        gameEvents.emit('game:stateChanged', {
            from: oldState,
            to: newState,
        });
    }

    /**
     * Return to the previous state (useful for closing overlays).
     */
    restorePreviousState() {
        if (this._previousState) {
            this.setState(this._previousState);
        }
    }

    /**
     * Get the current level number.
     * @returns {number}
     */
    getCurrentLevel() {
        return this.level;
    }

    // ──────────────────────────────────────────────────────────
    //  UI Screen helpers
    // ──────────────────────────────────────────────────────────

    /**
     * Show the HTML overlay for a given state.
     * @param {string} state
     * @private
     */
    _showScreenForState(state) {
        const id = STATE_SCREEN_MAP[state];
        if (id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        }
    }

    /**
     * Hide the HTML overlay for a given state.
     * @param {string} state
     * @private
     */
    _hideScreenForState(state) {
        const id = STATE_SCREEN_MAP[state];
        if (id) {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        }
    }

    /**
     * Clean up everything — call on page unload or full reset.
     */
    destroy() {
        this.stop();
        this.inputManager.destroy();
        gameEvents.clear();
    }
}
