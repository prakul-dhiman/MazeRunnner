/**
 * MazeBreaker: Shadow Protocol — Entry Point
 * Bootstraps and wires all systems: engine, managers, UI controllers,
 * and procedural Web Audio graphs.
 */

import GameEngine from './engine/GameEngine.js';
import LevelManager from './level/LevelManager.js';
import TileRenderer from './level/TileRenderer.js';
import StealthSystem from './systems/StealthSystem.js';
import FogOfWar from './systems/FogOfWar.js';
import PowerUpSystem from './systems/PowerUpSystem.js';
import InventorySystem from './systems/InventorySystem.js';
import ParticleSystem from './systems/ParticleSystem.js';
import ProgressionSystem from './systems/ProgressionSystem.js';
import EconomySystem from './systems/EconomySystem.js';
import UIManager from './ui/UIManager.js';
import HUD from './ui/HUD.js';
import MainMenu from './ui/MainMenu.js';
import PauseMenu from './ui/PauseMenu.js';
import SettingsMenu from './ui/SettingsMenu.js';
import GameOverScreen from './ui/GameOverScreen.js';
import LevelCompleteScreen from './ui/LevelCompleteScreen.js';
import ShopScreen from './ui/ShopScreen.js';
import AchievementScreen from './ui/AchievementScreen.js';
import LeaderboardScreen from './ui/LeaderboardScreen.js';
import AudioManager from './audio/AudioManager.js';
import SaveManager from './save/SaveManager.js';
import AchievementManager from './save/AchievementManager.js';
import { gameEvents } from './utils/EventBus.js';
import { GAME_STATES } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // ─── 1. Core Services & Managers ──────────────────────────────
    const saveManager = new SaveManager();
    const audioManager = new AudioManager();
    const achievementManager = new AchievementManager(saveManager);

    // ─── 2. Game Core Engine ──────────────────────────────────────
    const gameEngine = new GameEngine();

    // Register manager references on the engine
    gameEngine.saveManager = saveManager;
    gameEngine.achievementManager = achievementManager;

    // ─── 3. Systems & Pipelines ───────────────────────────────────
    const levelManager = new LevelManager(gameEngine);
    const tileRenderer = new TileRenderer(gameEngine.renderer);
    const particleSystem = new ParticleSystem();
    const stealthSystem = new StealthSystem();
    const fogSystem = new FogOfWar(gameEngine.renderer);
    const abilitySystem = new PowerUpSystem(gameEngine.inputManager);
    const inventorySystem = new InventorySystem();
    const progressionSystem = new ProgressionSystem();
    const economySystem = new EconomySystem(saveManager);

    // Register systems on the engine
    gameEngine.levelManager = levelManager;
    gameEngine.tileRenderer = tileRenderer;
    gameEngine.particleSystem = particleSystem;
    gameEngine.stealthSystem = stealthSystem;
    gameEngine.fogSystem = fogSystem;
    gameEngine.abilitySystem = abilitySystem;
    gameEngine.inventorySystem = inventorySystem;
    gameEngine.progressionSystem = progressionSystem;
    gameEngine.economySystem = economySystem;

    // ─── 4. UI Screens & Controllers ──────────────────────────────
    const hud = new HUD(gameEngine.renderer);
    gameEngine.hud = hud;

    const mainMenu = new MainMenu();
    const pauseMenu = new PauseMenu();
    const settingsMenu = new SettingsMenu(audioManager);
    const gameOverScreen = new GameOverScreen();
    const levelCompleteScreen = new LevelCompleteScreen();
    const shopScreen = new ShopScreen(economySystem, inventorySystem);
    const achievementScreen = new AchievementScreen(achievementManager);
    const leaderboardScreen = new LeaderboardScreen(saveManager);

    const uiManager = new UIManager(gameEngine);
    uiManager.init();

    // Map screen ID elements to their controllers
    const screenControllers = {
        'main-menu': mainMenu,
        'pause-menu': pauseMenu,
        'settings-menu': settingsMenu,
        'gameover-screen': gameOverScreen,
        'level-complete': levelCompleteScreen,
        'shop-screen': shopScreen,
        'achievements-screen': achievementScreen,
        'leaderboard-screen': leaderboardScreen,
    };

    // ─── 5. Screen Lifecycle Hooks ────────────────────────────────
    gameEvents.on('ui:screenChanged', ({ screen }) => {
        for (const [id, ctrl] of Object.entries(screenControllers)) {
            if (id === screen) {
                ctrl.show();
            } else {
                ctrl.hide();
            }
        }
    });

    gameEvents.on('game:stateChanged', ({ from, to }) => {
        const stateScreenMap = {
            [GAME_STATES.MENU]: 'main-menu',
            [GAME_STATES.PAUSED]: 'pause-menu',
            [GAME_STATES.SETTINGS]: 'settings-menu',
            [GAME_STATES.GAME_OVER]: 'gameover-screen',
            [GAME_STATES.LEVEL_COMPLETE]: 'level-complete',
            [GAME_STATES.SHOP]: 'shop-screen',
            [GAME_STATES.ACHIEVEMENTS]: 'achievements-screen',
            [GAME_STATES.LEADERBOARD]: 'leaderboard-screen',
        };

        const targetScreen = stateScreenMap[to];
        for (const [id, ctrl] of Object.entries(screenControllers)) {
            if (id === targetScreen) {
                ctrl.show();
            } else {
                ctrl.hide();
            }
        }
    });

    // ─── 6. Level Stats & State Tracking ──────────────────────────
    gameEngine.levelDetected = false;
    gameEngine.levelDamageTaken = 0;

    gameEvents.on('level:started', () => {
        gameEngine.levelDetected = false;
        gameEngine.levelDamageTaken = 0;
        audioManager.init();
        audioManager.startAmbient();
    });

    gameEvents.on('player:detected', () => {
        gameEngine.levelDetected = true;
        audioManager.playEnemyAlert();
        if (gameEngine.camera) {
            gameEngine.camera.shake(8, 200);
        }
    });

    gameEvents.on('player:noticed', () => {
        audioManager.playDetection();
    });

    gameEvents.on('player:damaged', ({ amount }) => {
        gameEngine.levelDamageTaken += amount;
        audioManager.playDamage();
        if (gameEngine.camera) {
            gameEngine.camera.shake(15, 300);
        }
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('damageBurst', gameEngine.player.px, gameEngine.player.py);
        }
    });

    // ─── 7. Global Audio & Sound FX Binding ────────────────────────
    // Lazy-init Web Audio Context on first interaction
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest?.('button') || e.target.closest?.('.menu-btn') || e.target.closest?.('.tab-btn') || e.target.closest?.('.shop-item')) {
            audioManager.playButtonHover();
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest?.('button') || e.target.closest?.('.menu-btn') || e.target.closest?.('.tab-btn') || e.target.closest?.('.shop-item')) {
            audioManager.init();
            audioManager.playButtonClick();
        }
    });

    gameEvents.on('audio:volumeChanged', ({ type, value }) => {
        audioManager.init();
        if (type === 'master') audioManager.setMasterVolume(value);
        if (type === 'music') audioManager.setMusicVolume(value);
        if (type === 'sfx') audioManager.setSfxVolume(value);
    });

    // Pickups and particles
    gameEvents.on('item:collected', ({ type }) => {
        if (type === 'coin') {
            audioManager.playCoinPickup();
            if (particleSystem && gameEngine.player) {
                particleSystem.emit('coinBurst', gameEngine.player.px, gameEngine.player.py);
            }
            inventorySystem.collectCoin();
        } else if (type === 'relic') {
            audioManager.playRelicPickup();
            if (particleSystem && gameEngine.player) {
                particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#ff00aa' });
            }
            inventorySystem.collectRelic();
        } else if (type === 'key') {
            audioManager.playRelicPickup();
            inventorySystem.collectKey();
        }
    });

    // Abilities
    gameEvents.on('ability:timeFreeze', () => {
        audioManager.playAbility('timeFreeze');
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#00f0ff' });
        }
    });
    gameEvents.on('ability:decoy', () => {
        audioManager.playAbility('decoy');
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#ff6a00' });
        }
    });
    gameEvents.on('ability:emp', () => {
        audioManager.playAbility('emp');
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#ffe600', count: 40 });
        }
    });
    gameEvents.on('ability:teleportBeacon', () => {
        audioManager.playAbility('teleport');
    });
    gameEvents.on('ability:teleport', () => {
        audioManager.playAbility('teleport');
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#bf00ff' });
        }
    });
    gameEvents.on('ability:cloak', () => {
        audioManager.playAbility('cloak');
        if (particleSystem && gameEngine.player) {
            particleSystem.emit('abilityRing', gameEngine.player.px, gameEngine.player.py, { color: '#39ff14' });
        }
    });

    // Sync shop purchases to economy systems and active player stats
    gameEvents.on('shop:purchased', () => {
        if (gameEngine.inventorySystem && gameEngine.economySystem) {
            gameEngine.economySystem.init(gameEngine.inventorySystem.upgrades);
            if (gameEngine.player) {
                gameEngine.economySystem.applyUpgrades(gameEngine.player);
            }
        }
        saveGame();
    });

    // ─── 8. Persistence ───────────────────────────────────────────
    function saveGame() {
        if (!saveManager || !gameEngine) return;
        saveManager.save({
            currentLevel: gameEngine.level,
            coins: gameEngine.inventorySystem.coins,
            totalCoins: gameEngine.inventorySystem.totalCoins,
            upgrades: gameEngine.inventorySystem.upgrades || [],
            achievements: achievementManager.getSaveData(),
            highScores: saveManager.getHighScores(),
            stats: saveManager.getStats(),
            settings: settingsMenu.settings
        });
    }

    // ─── 9. Save Game Validation & Bootstrap ──────────────────────
    // Check for existing save files to toggle the Continue button
    const hasSave = saveManager.hasSaveData();
    mainMenu.updateContinueButton(hasSave);

    // Initialise and start settings
    settingsMenu.init();

    // Initialise achievements
    achievementManager.init();
    
    // Connect screen controllers to initial menu state
    mainMenu.init?.();
    shopScreen.init?.();
    achievementScreen.init?.();
    leaderboardScreen.init?.();

    // Start engine lifecycle
    gameEngine.init();
    mainMenu.show();
});
