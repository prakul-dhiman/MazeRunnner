// Mock browser environment
// Mock document manually as in check.js but more detailed.

const mockElement = (id) => {
    const el = {
        id,
        addEventListener: (event, handler) => {
            if (event === 'click') {
                global.clickHandlers = global.clickHandlers || {};
                global.clickHandlers[id] = handler;
            }
        },
        classList: {
            add: (cls) => console.log(`[DOM] #${id} added class: ${cls}`),
            remove: (cls) => console.log(`[DOM] #${id} removed class: ${cls}`),
            contains: (cls) => false,
        },
        style: {},
        width: 960,
        height: 640,
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    const ctx = {
        canvas: el,
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        save: () => {},
        restore: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillText: () => {},
        closePath: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        roundRect: () => {},
        measureText: () => ({ width: 10 }),
    };
    el.getContext = () => ctx;
    return el;
};

global.clickHandlers = {};
global.document = {
    getElementById: (id) => mockElement(id),
    querySelectorAll: (selector) => {
        if (selector === '.ui-screen') {
            return [
                mockElement('main-menu'),
                mockElement('pause-menu'),
                mockElement('settings-menu'),
                mockElement('gameover-screen'),
                mockElement('level-complete'),
                mockElement('shop-screen'),
                mockElement('achievements-screen'),
                mockElement('leaderboard-screen'),
            ];
        }
        return [];
    },
    addEventListener: (event, handler) => {
        if (event === 'DOMContentLoaded') {
            global.domContentLoadedHandler = handler;
        }
    },
};

global.window = {
    AudioContext: function() {
        const connectMock = (t) => {
            return t || { connect: connectMock };
        };
        return {
            createGain: () => ({ connect: connectMock, gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
            createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
            createBufferSource: () => ({ buffer: {}, connect: connectMock, start: () => {}, stop: () => {} }),
            createOscillator: () => ({ connect: connectMock, start: () => {}, stop: () => {}, frequency: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, type: 'sine' }),
            createBiquadFilter: () => ({ connect: connectMock, frequency: { value: 1 }, Q: { value: 1 }, type: 'lowpass' }),
            currentTime: 0,
        };
    },
    webkitAudioContext: function() {},
    addEventListener: () => {}
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

global.performance = {
    now: () => Date.now()
};

global.HTMLElement = class {};
global.HTMLButtonElement = class {};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
    return setTimeout(() => callback(Date.now()), 16);
};
global.cancelAnimationFrame = (id) => clearTimeout(id);

console.log("Mock environment loaded. Importing main...");

try {
    await import('file:///c:/Users/Ansh/Desktop/Maze/src/main.js');
    console.log("main.js loaded. Simulating DOMContentLoaded...");
    global.domContentLoadedHandler();

    console.log("Triggering New Game click...");
    const newGameHandler = global.clickHandlers['btn-new-game'];
    if (newGameHandler) {
        newGameHandler();
        console.log("New Game triggered successfully. Letting the game loop tick for 100ms...");
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("Finished ticking.");
    } else {
        console.error("btn-new-game click handler not found!");
    }
} catch (e) {
    console.error("Simulation failed with error:", e);
}
