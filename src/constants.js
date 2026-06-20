/**
 * MazeBreaker: Shadow Protocol — Game Constants
 * Central configuration for all game systems.
 */

// ─── Canvas & Display ───────────────────────────────────────────
export const TILE_SIZE = 32;
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;
export const TARGET_FPS = 60;
export const FIXED_DT = 1000 / TARGET_FPS; // 16.667ms

// ─── Game States ────────────────────────────────────────────────
export const GAME_STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    SHOP: 'SHOP',
    ACHIEVEMENTS: 'ACHIEVEMENTS',
    LEADERBOARD: 'LEADERBOARD',
    SETTINGS: 'SETTINGS',
};

// ─── Colors — Cyber-Fantasy Palette ─────────────────────────────
export const COLORS = {
    // Primary neon accents
    NEON_CYAN: '#00f0ff',
    NEON_MAGENTA: '#ff00aa',
    NEON_GREEN: '#39ff14',
    NEON_ORANGE: '#ff6a00',
    NEON_PURPLE: '#bf00ff',
    NEON_YELLOW: '#ffe600',
    NEON_RED: '#ff073a',

    // Background tones
    BG_DARK: '#0a0a1a',
    BG_MEDIUM: '#111128',
    BG_LIGHT: '#1a1a3e',

    // Walls and floors
    WALL_PRIMARY: '#1e1e4a',
    WALL_GLOW: '#3a3a8a',
    WALL_EDGE: '#5050aa',
    FLOOR_PRIMARY: '#0d0d2b',
    FLOOR_PATTERN: '#12123a',

    // Entity colors
    PLAYER: '#00f0ff',
    PLAYER_GLOW: '#00f0ff44',
    ENEMY_SCOUT: '#ff6a00',
    ENEMY_HUNTER: '#ff073a',
    ENEMY_PHANTOM: '#bf00ff',
    ENEMY_SENTINEL: '#ffe600',

    // Collectibles
    COIN: '#ffd700',
    RELIC: '#ff00aa',
    KEY: '#39ff14',

    // UI
    HP_BAR: '#ff073a',
    STAMINA_BAR: '#39ff14',
    XP_BAR: '#00f0ff',
    DETECTION_LOW: '#39ff14',
    DETECTION_MED: '#ffe600',
    DETECTION_HIGH: '#ff073a',

    // Fog
    FOG_HIDDEN: 'rgba(5, 5, 15, 0.95)',
    FOG_EXPLORED: 'rgba(10, 10, 30, 0.6)',

    // Text
    TEXT_PRIMARY: '#e0e0ff',
    TEXT_SECONDARY: '#8888aa',
    TEXT_ACCENT: '#00f0ff',
};

// ─── Player Defaults ────────────────────────────────────────────
export const PLAYER = {
    SPEED: 2.5,
    SPRINT_SPEED: 4.2,
    MAX_HP: 3,
    MAX_STAMINA: 100,
    STAMINA_DRAIN: 0.8,     // per frame while sprinting
    STAMINA_REGEN: 0.3,     // per frame while not sprinting
    VISIBILITY_RADIUS: 5,   // tiles
    SIZE: 0.7,              // fraction of TILE_SIZE
    NOISE_WALK: 0.3,
    NOISE_SPRINT: 0.8,
    INVULNERABILITY_TIME: 1500, // ms after taking damage
};

// ─── Enemy Configurations ───────────────────────────────────────
export const ENEMIES = {
    SCOUT: {
        type: 'scout',
        name: 'Scout Unit',
        speed: 1.8,
        visionRange: 3,
        visionAngle: Math.PI / 3,    // 60°
        color: '#ff6a00',
        glowColor: '#ff6a0044',
        patrolRadius: 6,
        detectionRate: 0.6,
        attackDamage: 1,
        attackCooldown: 2000,
    },
    HUNTER: {
        type: 'hunter',
        name: 'Hunter Unit',
        speed: 2.2,
        visionRange: 5,
        visionAngle: Math.PI / 4,    // 45°
        color: '#ff073a',
        glowColor: '#ff073a44',
        patrolRadius: 8,
        detectionRate: 0.8,
        pathRecalcInterval: 300,     // ms
        attackDamage: 1,
        attackCooldown: 1500,
    },
    PHANTOM: {
        type: 'phantom',
        name: 'Phantom Unit',
        speed: 1.6,
        visionRange: 4,
        visionAngle: Math.PI / 3,
        color: '#bf00ff',
        glowColor: '#bf00ff44',
        patrolRadius: 10,
        detectionRate: 0.7,
        canPhaseWalls: true,
        attackDamage: 1,
        attackCooldown: 2500,
    },
    SENTINEL: {
        type: 'sentinel',
        name: 'Sentinel Unit',
        speed: 0,
        visionRange: 6,
        visionAngle: Math.PI * 2,    // 360°
        color: '#ffe600',
        glowColor: '#ffe60044',
        isStationary: true,
        detectionRate: 1.0,
        alertRadius: 10,
        attackDamage: 0,
        attackCooldown: 0,
    },
};

// ─── AI States ──────────────────────────────────────────────────
export const AI_STATES = {
    PATROL: 'PATROL',
    INVESTIGATE: 'INVESTIGATE',
    SEARCH: 'SEARCH',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
    RETURN: 'RETURN',
};

// ─── Abilities ──────────────────────────────────────────────────
export const ABILITIES = {
    TIME_FREEZE: {
        id: 'timeFreeze',
        name: 'Time Freeze',
        key: '1',
        keyCode: 'Digit1',
        duration: 3000,
        cooldown: 30000,
        icon: '⏱',
        color: '#00f0ff',
        description: 'Freeze all enemy movement',
    },
    DECOY: {
        id: 'decoy',
        name: 'Decoy Signal',
        key: '2',
        keyCode: 'Digit2',
        duration: 5000,
        cooldown: 25000,
        icon: '◎',
        color: '#ff6a00',
        description: 'Deploy false position marker',
    },
    EMP: {
        id: 'emp',
        name: 'EMP Pulse',
        key: '3',
        keyCode: 'Digit3',
        duration: 4000,
        cooldown: 35000,
        icon: '⚡',
        color: '#ffe600',
        radius: 4, // tiles
        description: 'Disable nearby enemies',
    },
    TELEPORT: {
        id: 'teleport',
        name: 'Teleport Beacon',
        key: '4',
        keyCode: 'Digit4',
        duration: 0,
        cooldown: 45000,
        icon: '⊕',
        color: '#bf00ff',
        description: 'Emergency repositioning',
    },
    CLOAK: {
        id: 'cloak',
        name: 'Cloaking Device',
        key: '5',
        keyCode: 'Digit5',
        duration: 5000,
        cooldown: 40000,
        icon: '◈',
        color: '#39ff14',
        description: 'Temporary invisibility',
    },
};

// ─── Maze Generation ────────────────────────────────────────────
export const MAZE = {
    MIN_COLS: 15,
    MIN_ROWS: 11,
    MAX_COLS: 35,
    MAX_ROWS: 25,
    WALL_REMOVAL_RATE: 0.08,  // fraction of walls to remove for multiple paths
    GROWTH_COLS: 2,           // columns added per level
    GROWTH_ROWS: 1,           // rows added per level
};

// ─── Level Scaling ──────────────────────────────────────────────
export const LEVEL = {
    MAX_LEVELS: 25,
    BASE_ENEMIES: 2,
    ENEMIES_PER_LEVEL: 0.8,
    BASE_COINS: 8,
    COINS_PER_LEVEL: 3,
    BASE_RELICS: 2,
    RELICS_PER_LEVEL: 0.5,
    BASE_TIME_BONUS: 120,     // seconds
    TIME_REDUCTION: 3,        // seconds reduced per level
    MIN_TIME_BONUS: 30,
};

// ─── Economy ────────────────────────────────────────────────────
export const ECONOMY = {
    COIN_VALUE: 10,
    RELIC_VALUE: 50,
    LEVEL_COMPLETE_BONUS: 100,
    STEALTH_BONUS: 50,
    SPEED_BONUS: 75,
    NO_DAMAGE_BONUS: 100,
};

// ─── Upgrade Definitions ────────────────────────────────────────
export const UPGRADES = {
    mobility: [
        { id: 'move_speed_1', name: 'Swift Legs I', desc: 'Move speed +10%', cost: 100, effect: { stat: 'moveSpeed', mult: 1.1 }, tier: 1 },
        { id: 'move_speed_2', name: 'Swift Legs II', desc: 'Move speed +20%', cost: 250, effect: { stat: 'moveSpeed', mult: 1.2 }, tier: 2, requires: 'move_speed_1' },
        { id: 'sprint_dur', name: 'Endurance', desc: 'Sprint +20% duration', cost: 200, effect: { stat: 'maxStamina', mult: 1.2 }, tier: 1 },
        { id: 'sprint_regen', name: 'Quick Recovery', desc: 'Stamina regen +25%', cost: 300, effect: { stat: 'staminaRegen', mult: 1.25 }, tier: 2, requires: 'sprint_dur' },
    ],
    stealth: [
        { id: 'detect_range', name: 'Low Profile I', desc: 'Detection range -15%', cost: 150, effect: { stat: 'detectionRange', mult: 0.85 }, tier: 1 },
        { id: 'noise_reduce', name: 'Silent Step', desc: 'Noise output -20%', cost: 200, effect: { stat: 'noise', mult: 0.8 }, tier: 1 },
        { id: 'detect_delay', name: 'Ghost Protocol', desc: 'Detection delay +30%', cost: 400, effect: { stat: 'detectionDelay', mult: 1.3 }, tier: 2, requires: 'detect_range' },
        { id: 'noise_reduce_2', name: 'Phantom Walk', desc: 'Noise output -40%', cost: 500, effect: { stat: 'noise', mult: 0.6 }, tier: 3, requires: 'noise_reduce' },
    ],
    vision: [
        { id: 'fog_radius', name: 'Enhanced Optics', desc: 'Vision radius +20%', cost: 150, effect: { stat: 'visionRadius', mult: 1.2 }, tier: 1 },
        { id: 'fog_radius_2', name: 'Night Vision', desc: 'Vision radius +40%', cost: 350, effect: { stat: 'visionRadius', mult: 1.4 }, tier: 2, requires: 'fog_radius' },
        { id: 'minimap', name: 'Minimap Module', desc: 'Unlock minimap', cost: 300, effect: { stat: 'minimap', value: true }, tier: 1 },
        { id: 'enemy_indicator', name: 'Threat Scanner', desc: 'Enemy indicator +30%', cost: 400, effect: { stat: 'enemyIndicator', mult: 1.3 }, tier: 2, requires: 'minimap' },
    ],
    power: [
        { id: 'cooldown_1', name: 'Overclock I', desc: 'Cooldowns -15%', cost: 200, effect: { stat: 'cooldown', mult: 0.85 }, tier: 1 },
        { id: 'duration_1', name: 'Amplifier I', desc: 'Ability duration +20%', cost: 250, effect: { stat: 'abilityDuration', mult: 1.2 }, tier: 1 },
        { id: 'cooldown_2', name: 'Overclock II', desc: 'Cooldowns -30%', cost: 500, effect: { stat: 'cooldown', mult: 0.7 }, tier: 2, requires: 'cooldown_1' },
        { id: 'duration_2', name: 'Amplifier II', desc: 'Ability duration +40%', cost: 600, effect: { stat: 'abilityDuration', mult: 1.4 }, tier: 3, requires: 'duration_1' },
    ],
    survival: [
        { id: 'max_hp_1', name: 'Reinforced Core', desc: 'Max HP +1', cost: 300, effect: { stat: 'maxHp', add: 1 }, tier: 1 },
        { id: 'max_hp_2', name: 'Armored Core', desc: 'Max HP +2', cost: 700, effect: { stat: 'maxHp', add: 2 }, tier: 2, requires: 'max_hp_1' },
        { id: 'damage_resist', name: 'Shield Matrix', desc: 'Damage resist +15%', cost: 250, effect: { stat: 'damageResist', mult: 0.85 }, tier: 1 },
        { id: 'auto_heal', name: 'Nano Repair', desc: 'Slow auto-heal', cost: 500, effect: { stat: 'autoHeal', value: 0.002 }, tier: 2, requires: 'damage_resist' },
    ],
};

// ─── Achievement Definitions ────────────────────────────────────
export const ACHIEVEMENTS = [
    { id: 'ghost_runner', name: 'Ghost Runner', desc: 'Complete a level without being detected', icon: '👻', condition: 'noDetection' },
    { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Collect all relics in a level', icon: '💎', condition: 'allRelics' },
    { id: 'master_strategist', name: 'Master Strategist', desc: 'Complete a level without abilities', icon: '🧠', condition: 'noAbilities' },
    { id: 'survivor_10', name: 'Survivor', desc: 'Reach level 10', icon: '🛡', condition: 'reachLevel10' },
    { id: 'shadow_master', name: 'Shadow Master', desc: 'Reach level 20', icon: '🌑', condition: 'reachLevel20' },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Complete a level in under 60 seconds', icon: '⚡', condition: 'speedRun' },
    { id: 'pacifist', name: 'Pacifist', desc: 'Never trigger any enemy alert', icon: '🕊', condition: 'noAlerts' },
    { id: 'explorer', name: 'Explorer', desc: 'Reveal 100% of a maze', icon: '🗺', condition: 'fullExplore' },
    { id: 'hoarder', name: 'Hoarder', desc: 'Accumulate 5000 coins total', icon: '💰', condition: 'totalCoins5000' },
    { id: 'untouchable', name: 'Untouchable', desc: 'Complete 5 levels without damage', icon: '✨', condition: 'noDamage5' },
    { id: 'architects_nemesis', name: "Architect's Nemesis", desc: 'Complete all 25 levels', icon: '🏆', condition: 'completeAll' },
    { id: 'completionist', name: 'Completionist', desc: 'Unlock all other achievements', icon: '🌟', condition: 'allAchievements' },
];

// ─── Particle Presets ───────────────────────────────────────────
export const PARTICLES = {
    MAX_PARTICLES: 500,
    COIN_BURST: {
        count: 12,
        speed: 3,
        life: 600,
        size: 3,
        color: '#ffd700',
        gravity: 0.05,
    },
    DAMAGE_BURST: {
        count: 20,
        speed: 4,
        life: 400,
        size: 2,
        color: '#ff073a',
        gravity: 0,
    },
    ABILITY_RING: {
        count: 30,
        speed: 2,
        life: 800,
        size: 2,
        gravity: 0,
    },
    AMBIENT: {
        count: 1,
        speed: 0.3,
        life: 3000,
        size: 1,
        color: '#00f0ff22',
        gravity: -0.01,
    },
};

// ─── Input Key Mappings ─────────────────────────────────────────
export const KEYS = {
    UP: ['KeyW', 'ArrowUp'],
    DOWN: ['KeyS', 'ArrowDown'],
    LEFT: ['KeyA', 'ArrowLeft'],
    RIGHT: ['KeyD', 'ArrowRight'],
    SPRINT: ['ShiftLeft', 'ShiftRight'],
    PAUSE: ['Escape'],
    ABILITY_1: ['Digit1'],
    ABILITY_2: ['Digit2'],
    ABILITY_3: ['Digit3'],
    ABILITY_4: ['Digit4'],
    ABILITY_5: ['Digit5'],
};

// ─── Direction Vectors ──────────────────────────────────────────
export const DIRECTIONS = [
    { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },     // North
    { dx: 1, dy: 0, wall: 'right', opposite: 'left' },      // East
    { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },      // South
    { dx: -1, dy: 0, wall: 'left', opposite: 'right' },     // West
];
