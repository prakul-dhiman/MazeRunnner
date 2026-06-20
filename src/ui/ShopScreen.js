/**
 * MazeBreaker: Shadow Protocol — Shop Screen
 * Tabbed upgrade shop where players spend coins on permanent upgrades.
 */

import { UPGRADES, COLORS } from '../constants.js';
import { gameEvents } from '../utils/EventBus.js';

export default class ShopScreen {
    /**
     * @param {object} economySystem - Handles coin balance
     * @param {object} inventory - Player inventory with owned upgrades
     */
    constructor(economySystem, inventory) {
        /** @type {HTMLElement|null} */
        this.el = document.getElementById('shop-screen');

        /** @type {object} */
        this.economy = economySystem;

        /** @type {object} */
        this.inventory = inventory;

        /** @type {string} Currently active tab */
        this._activeTab = 'mobility';

        /** @type {HTMLElement|null} */
        this._tabsEl = document.getElementById('shop-tabs');

        /** @type {HTMLElement|null} */
        this._itemsEl = document.getElementById('shop-items');

        /** @type {HTMLElement|null} */
        this._coinsEl = document.getElementById('shop-coins');
    }

    // ─── Initialisation ─────────────────────────────────────────

    /** Bind tab switching and item interaction events. */
    init() {
        // Tab clicks
        if (this._tabsEl) {
            this._tabsEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                const tab = btn.dataset.tab;
                if (tab) this.selectTab(tab);
            });
        }

        // Item clicks (delegated)
        if (this._itemsEl) {
            this._itemsEl.addEventListener('click', (e) => {
                const card = e.target.closest('.shop-item');
                if (!card) return;
                const upgradeId = card.dataset.id;
                if (upgradeId) this.onItemClick(upgradeId);
            });
        }
    }

    // ─── Screen Lifecycle ───────────────────────────────────────

    /** Display the shop and populate the current tab. */
    show() {
        if (this.el) this.el.classList.add('active');
        this.updateCoinDisplay();
        this.populateItems(this._activeTab);
    }

    /** Hide the shop screen. */
    hide() {
        if (this.el) this.el.classList.remove('active');
    }

    // ─── Tab Management ─────────────────────────────────────────

    /**
     * Switch the active tab and repopulate items.
     * @param {string} category
     */
    selectTab(category) {
        this._activeTab = category;

        // Update tab button states
        if (this._tabsEl) {
            this._tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === category);
            });
        }

        this.populateItems(category);
    }

    // ─── Item Display ───────────────────────────────────────────

    /**
     * Create shop item cards for every upgrade in the given category.
     * @param {string} category
     */
    populateItems(category) {
        if (!this._itemsEl) return;

        const upgrades = UPGRADES[category] ?? [];
        const ownedIds = this._getOwnedIds();
        const coins = this._getCoins();

        this._itemsEl.innerHTML = upgrades.map(upgrade => {
            const owned = ownedIds.has(upgrade.id);
            const locked = upgrade.requires && !ownedIds.has(upgrade.requires);
            const canAfford = coins >= upgrade.cost;

            let stateClass = '';
            if (owned) stateClass = 'owned';
            else if (locked) stateClass = 'locked';
            else if (!canAfford) stateClass = 'expensive';

            return `
                <div class="shop-item ${stateClass}" data-id="${upgrade.id}">
                    <div class="item-header">
                        <span class="item-name">${upgrade.name}</span>
                        <span class="item-tier">T${upgrade.tier}</span>
                    </div>
                    <p class="item-desc">${upgrade.desc}</p>
                    <div class="item-footer">
                        <span class="item-cost">${owned ? 'OWNED' : (locked ? '🔒 LOCKED' : `◈ ${upgrade.cost}`)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─── Purchase Logic ─────────────────────────────────────────

    /**
     * Attempt to purchase an upgrade.
     * @param {string} upgradeId
     */
    onItemClick(upgradeId) {
        const ownedIds = this._getOwnedIds();
        if (ownedIds.has(upgradeId)) return; // Already owned

        // Find the upgrade definition
        const upgrade = this._findUpgrade(upgradeId);
        if (!upgrade) return;

        // Check prerequisites
        if (upgrade.requires && !ownedIds.has(upgrade.requires)) return;

        // Check funds
        const coins = this._getCoins();
        if (coins < upgrade.cost) return;

        // Deduct cost and add to inventory
        if (this.economy?.spendCoins) {
            this.economy.spendCoins(upgrade.cost);
        } else if (this.inventory) {
            this.inventory.coins = (this.inventory.coins ?? 0) - upgrade.cost;
        }

        // Register as owned
        if (this.inventory) {
            if (!this.inventory.upgrades) this.inventory.upgrades = [];
            this.inventory.upgrades.push(upgradeId);
        }

        gameEvents.emit('shop:purchased', { upgrade });

        // Refresh display
        this.updateCoinDisplay();
        this.populateItems(this._activeTab);
    }

    /** Update the coin counter in the shop header. */
    updateCoinDisplay() {
        if (this._coinsEl) {
            this._coinsEl.textContent = String(this._getCoins());
        }
    }

    // ─── Helpers ────────────────────────────────────────────────

    /** @private @returns {Set<string>} */
    _getOwnedIds() {
        const arr = this.inventory?.upgrades ?? [];
        return new Set(arr);
    }

    /** @private @returns {number} */
    _getCoins() {
        return this.economy?.getCoins?.() ?? this.inventory?.coins ?? 0;
    }

    /**
     * Find an upgrade by ID across all categories.
     * @private
     * @param {string} id
     * @returns {object|null}
     */
    _findUpgrade(id) {
        for (const category of Object.values(UPGRADES)) {
            const found = category.find(u => u.id === id);
            if (found) return found;
        }
        return null;
    }
}
