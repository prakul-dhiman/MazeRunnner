/**
 * MazeBreaker: Shadow Protocol — Pause Menu
 * Overlay controller for the in-game pause screen.
 */

export default class PauseMenu {
    constructor() {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('pause-menu');
    }

    /** Display the pause overlay. */
    show() {
        if (this.el) this.el.classList.add('active');
    }

    /** Hide the pause overlay. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }
}
