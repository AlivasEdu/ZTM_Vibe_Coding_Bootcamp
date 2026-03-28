/**
 * SCOUNDREL - A Solo Dungeon-Crawl Card Game
 * ============================================
 * Complete game logic, state management, and UI rendering
 */

// ============================================
// CONSTANTS AND CONFIGURATION
// ============================================

const CONFIG = {
    MAX_HEALTH: 20,
    INITIAL_DECK_SIZE: 44,
    ROOM_SIZE: 4,
    CARDS_TO_RESOLVE: 3,
    STORAGE_KEY: 'scoundrel_game_state'
};

const CARD_TYPES = {
    MONSTER: 'monster',
    WEAPON: 'weapon',
    POTION: 'potion'
};

const SUITS = {
    CLUBS: '♣',
    SPADES: '♠',
    DIAMONDS: '♦',
    HEARTS: '♥'
};

const FACE_CARDS = {
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Fisher-Yates Shuffle with optional seed for reproducibility
 * @param {Array} array - Array to shuffle
 * @param {number} seed - Optional seed for reproducible shuffles
 * @returns {Array} - Shuffled array
 * 
 * Example:
 * Input: [1, 2, 3, 4, 5]
 * Output: [3, 1, 5, 2, 4] (randomized)
 */
function fisherYatesShuffle(array, seed = null) {
    const arr = [...array];
    let random = Math.random;
    
    // If seed provided, use seeded random
    if (seed !== null) {
        let s = seed;
        random = function() {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }
    
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    
    return arr;
}

/**
 * Get numeric value of a card (handles face cards)
 * @param {string} rank - Card rank (2-10, J, Q, K, A)
 * @returns {number} - Numeric value
 */
function getCardValue(rank) {
    if (FACE_CARDS[rank]) {
        return FACE_CARDS[rank];
    }
    return parseInt(rank, 10);
}

/**
 * Get random image for card type
 * @param {string} suit - Card suit
 * @returns {string} - Image filename
 */
function getCardImage(suit) {
    const randomNum = Math.floor(Math.random() * 3) + 1;
    
    switch (suit) {
        case SUITS.CLUBS:
            return `club-${randomNum}.jpg`;
        case SUITS.SPADES:
            return `spade-${randomNum}.jpg`;
        case SUITS.DIAMONDS:
            return `diamond-${randomNum}.jpg`;
        case SUITS.HEARTS:
            return `heart.jpg`;
        default:
            return `deck.jpg`;
    }
}

/**
 * Create a card object
 * @param {string} suit - Card suit
 * @param {string} rank - Card rank
 * @returns {Object} - Card object
 */
function createCard(suit, rank) {
    const value = getCardValue(rank);
    let type;
    
    if (suit === SUITS.DIAMONDS) {
        type = CARD_TYPES.WEAPON;
    } else if (suit === SUITS.HEARTS) {
        type = CARD_TYPES.POTION;
    } else {
        type = CARD_TYPES.MONSTER;
    }
    
    return {
        suit,
        rank,
        value,
        type,
        id: `${suit}${rank}`,
        image: getCardImage(suit)
    };
}

/**
 * Build the complete 44-card deck
 * Excludes: Jokers, red face cards (J/Q/K ♥♦), red Aces (A♥, A♦)
 * Remaining:
 * - 26 Monsters: all ♣ and ♠ (2-10, J=11, Q=12, K=13, A=14)
 * - 9 Weapons: ♦ 2-10
 * - 9 Potions: ♥ 2-10
 * 
 * @returns {Array} - Array of card objects
 */
function buildDeck() {
    const deck = [];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Add all clubs (monsters)
    ranks.forEach(rank => {
        deck.push(createCard(SUITS.CLUBS, rank));
    });
    
    // Add all spades (monsters)
    ranks.forEach(rank => {
        deck.push(createCard(SUITS.SPADES, rank));
    });
    
    // Add diamonds 2-10 (weapons) - excludes J, Q, K, A
    for (let i = 2; i <= 10; i++) {
        deck.push(createCard(SUITS.DIAMONDS, i.toString()));
    }
    
    // Add hearts 2-10 (potions) - excludes J, Q, K, A
    for (let i = 2; i <= 10; i++) {
        deck.push(createCard(SUITS.HEARTS, i.toString()));
    }
    
    return deck;
}

// ============================================
// GAME STATE
// ============================================

class GameState {
    constructor() {
        this.reset();
    }
    
    reset(seed = null) {
        this.health = CONFIG.MAX_HEALTH;
        this.deck = fisherYatesShuffle(buildDeck(), seed);
        this.discard = [];
        this.room = [];
        this.carryCard = null; // 4th card from previous room
        this.weapon = null; // { value, lastDefeated, defeatedStack }
        this.turn = 0;
        this.cardsResolvedThisRoom = 0;
        this.usedPotionThisRoom = false;
        this.lastAction = null; // 'avoid' or 'face' - prevents consecutive avoids
        this.facingRoom = false; // true after selecting first card in a room
        this.gameOver = false;
        this.won = false;
        this.seed = seed;
        this.initialDeckOrder = this.deck.map(c => c.id);
    }
    
    /**
     * Get current game state for persistence
     */
    serialize() {
        return {
            health: this.health,
            deck: this.deck,
            discard: this.discard,
            room: this.room,
            carryCard: this.carryCard,
            weapon: this.weapon,
            turn: this.turn,
            cardsResolvedThisRoom: this.cardsResolvedThisRoom,
            usedPotionThisRoom: this.usedPotionThisRoom,
            lastAction: this.lastAction,
            facingRoom: this.facingRoom,
            gameOver: this.gameOver,
            won: this.won,
            seed: this.seed,
            initialDeckOrder: this.initialDeckOrder
        };
    }
    
    /**
     * Load game state from saved data
     */
    deserialize(data) {
        Object.assign(this, data);
    }
}

// ============================================
// GAME LOGIC
// ============================================

class Game {
    constructor() {
        this.state = new GameState();
        this.ui = null; // Will be set by UI class
    }
    
    /**
     * Start a new game
     * @param {number} seed - Optional seed for reproducible games
     */
    newGame(seed = null) {
        this.state.reset(seed);
        this.drawRoom();
        this.saveState();
        if (this.ui) {
            this.ui.log('New game started! Good luck, adventurer!', 'info');
            this.ui.render();
        }
    }
    
    /**
     * Restart with the same seed
     */
    restart() {
        if (this.state.seed !== null) {
            this.newGame(this.state.seed);
        } else {
            // If no seed, use the initial deck order to reconstruct
            const seed = this.state.initialDeckOrder.join('').split('').reduce((a, b) => {
                return a + b.charCodeAt(0);
            }, 0);
            this.newGame(seed);
        }
    }
    
    /**
     * Draw cards until room has 4 cards
     * Includes carry card from previous room if exists
     */
    drawRoom() {
        this.state.turn++;
        this.state.cardsResolvedThisRoom = 0;
        this.state.usedPotionThisRoom = false;
        
        // Keep only unresolved cards from current room
        const unresolvedCards = this.state.room.filter(card => card && !card.resolved);
        
        // Start with carry card if exists (actual card, not a copy)
        if (this.state.carryCard) {
            this.state.carryCard.resolved = false;
            this.state.room = [this.state.carryCard, ...unresolvedCards];
            this.state.carryCard = null;
        } else {
            this.state.room = unresolvedCards;
        }
        
        // Draw cards from deck until we have 4 (use actual cards from deck)
        while (this.state.room.length < CONFIG.ROOM_SIZE && this.state.deck.length > 0) {
            const card = this.state.deck.shift();
            card.resolved = false;
            this.state.room.push(card);
        }
        
        // Check if we can't fill the room (deck empty)
        if (this.state.room.length < CONFIG.ROOM_SIZE && this.state.deck.length === 0) {
            // Game ends - either win or loss based on remaining cards
            this.endGame();
        }
    }
    
    /**
     * Check if avoid is allowed
     * Cannot avoid if:
     * - Already avoided last turn (no consecutive avoids)
     * - Currently facing the room (after selecting first card)
     * - Game is over
     */
    canAvoid() {
        return this.state.lastAction !== 'avoid' && 
               !this.state.facingRoom && 
               !this.state.gameOver;
    }
    
    /**
     * Avoid the room - put all 4 cards at bottom of deck
     * Cannot avoid twice in a row
     */
    avoidRoom() {
        if (!this.canAvoid()) {
            return false;
        }
        
        // Validate: all cards in room should be from the deck
        const roomCards = this.state.room.filter(c => c);
        if (this.ui) {
            this.ui.log(`Placing ${roomCards.length} cards at bottom of deck.`, 'info');
        }
        
        // Move all room cards to bottom of deck (in order)
        this.state.deck.push(...this.state.room);
        this.state.room = [];
        this.state.lastAction = 'avoid';
        
        if (this.ui) {
            this.ui.log('Avoided the room. Cards placed at bottom of deck.', 'info');
        }
        
        // Draw next room (from top of deck)
        this.drawRoom();
        this.saveState();
        
        if (this.ui) {
            this.ui.render();
        }
        
        return true;
    }
    
    /**
     * Select a card from the room to resolve
     * @param {number} index - Index of card in room (0-3)
     */
    selectCard(index) {
        if (this.state.gameOver) return false;
        if (this.state.cardsResolvedThisRoom >= CONFIG.CARDS_TO_RESOLVE) return false;
        
        const card = this.state.room[index];
        if (!card || card.resolved) return false;
        
        // Mark that we're now facing the room (first card selected)
        this.state.facingRoom = true;
        
        // Resolve the card
        this.resolveCard(card, index);
        return true;
    }
    
    /**
     * Resolve a card based on its type
     * @param {Object} card - Card to resolve
     * @param {number} index - Index in room
     */
    resolveCard(card, index) {
        card.resolved = true;
        this.state.cardsResolvedThisRoom++;
        this.state.lastAction = 'face';
        
        switch (card.type) {
            case CARD_TYPES.WEAPON:
                this.equipWeapon(card);
                break;
            case CARD_TYPES.POTION:
                this.usePotion(card);
                break;
            case CARD_TYPES.MONSTER:
                this.fightMonster(card);
                break;
        }
        
        // Card is removed from the game (not added to discard)
        // The card stays in room array but marked as resolved
        
        // Check if game ended (e.g., player died)
        if (this.state.gameOver) {
            this.saveState();
            if (this.ui) {
                this.ui.render();
            }
            return;
        }
        
        // Check if we've resolved 3 cards
        if (this.state.cardsResolvedThisRoom >= CONFIG.CARDS_TO_RESOLVE) {
            this.endRoom();
        }
        
        this.saveState();
        
        if (this.ui) {
            this.ui.render();
        }
    }
    
    /**
     * Equip a new weapon
     * Discards old weapon and its defeated monster stack
     * Resets weapon history
     * 
     * Example:
     * - Have weapon ♦7 with monsters [7, 5, 3] defeated
     * - Equip ♦8
     * - Old weapon and stack discarded
     * - New weapon ♦8 has empty defeated stack
     */
    equipWeapon(card) {
        // Discard old weapon and its stack
        if (this.state.weapon) {
            if (this.ui) {
                this.ui.log(`Discarded old weapon ♦${this.state.weapon.value} and its defeated monsters.`, 'weapon');
            }
        }
        
        this.state.weapon = {
            value: card.value,
            lastDefeated: null,
            defeatedStack: []
        };
        
        if (this.ui) {
            this.ui.log(`Equipped weapon ♦${card.value}!`, 'weapon');
        }
    }
    
    /**
     * Use a potion to heal
     * Only one potion per room may be used
     * Healing capped at max health (20)
     * 
     * Example:
     * - Health: 15, Potion: ♥8
     * - Heal 8 → Health becomes 20 (capped)
     * 
     * Example (potion restriction):
     * - Used ♥5 this room
     * - Pick ♥7 → discarded without effect
     */
    usePotion(card) {
        if (this.state.usedPotionThisRoom) {
            if (this.ui) {
                this.ui.log(`Potion ♥${card.value} discarded (already used potion this room).`, 'info');
            }
            return;
        }
        
        this.state.usedPotionThisRoom = true;
        const healAmount = card.value;
        const oldHealth = this.state.health;
        this.state.health = Math.min(CONFIG.MAX_HEALTH, this.state.health + healAmount);
        const actualHeal = this.state.health - oldHealth;
        
        if (this.ui) {
            if (actualHeal < healAmount) {
                this.ui.log(`Used potion ♥${card.value}. Healed ${actualHeal} (capped at ${CONFIG.MAX_HEALTH}).`, 'heal');
            } else {
                this.ui.log(`Used potion ♥${card.value}. Healed ${actualHeal} health!`, 'heal');
            }
        }
    }
    
    /**
     * Fight a monster
     * Bare-handed: Take full damage
     * With weapon: Damage = monster - weapon (min 0)
     * Weapon rule: Can only fight monsters ≤ last defeated value
     * 
     * Example (weapon combat):
     * - Weapon ♦7, last defeated 7
     * - Fight ♣5: Damage = max(0, 5-7) = 0. Monster defeated!
     * - Weapon last defeated now 5
     * - Can now only fight monsters ≤ 5
     * 
     * Example (weapon rule violation):
     * - Weapon ♦7, last defeated 5
     * - Fight ♣8: Not allowed! Monster value > last defeated
     * - Must fight bare-handed: Take 8 damage
     */
    fightMonster(card) {
        const monsterValue = card.value;
        let damage = monsterValue;
        let usedWeapon = false;
        
        if (this.state.weapon) {
            const weapon = this.state.weapon;
            
            // Check weapon rule: can only fight monsters ≤ last defeated
            // If no monsters defeated yet, can fight any monster
            const canUseWeapon = weapon.lastDefeated === null || 
                                 monsterValue <= weapon.lastDefeated;
            
            if (canUseWeapon) {
                // Calculate damage with weapon
                damage = Math.max(0, monsterValue - weapon.value);
                usedWeapon = true;
                
                // Update weapon's defeated stack and last defeated
                weapon.defeatedStack.push(card);
                weapon.lastDefeated = monsterValue;
                
                if (this.ui) {
                    if (damage === 0) {
                        this.ui.log(`Fought ♣${card.rank} with ♦${weapon.value}. No damage! Monster defeated.`, 'weapon');
                    } else {
                        this.ui.log(`Fought ♣${card.rank} with ♦${weapon.value}. Took ${damage} damage.`, 'damage');
                    }
                }
            } else {
                // Weapon rule violated - fight bare-handed
                if (this.ui) {
                    this.ui.log(`Cannot use ♦${weapon.value} against ♣${card.rank} (${monsterValue} > ${weapon.lastDefeated}). Fighting bare-handed!`, 'damage');
                }
            }
        } else {
            if (this.ui) {
                this.ui.log(`No weapon! Fought ♣${card.rank} bare-handed. Took ${damage} damage.`, 'damage');
            }
        }
        
        // Apply damage
        this.state.health -= damage;
        
        // Check for death
        if (this.state.health <= 0) {
            this.state.health = 0;
            this.endGame();
        }
    }
    
    /**
     * End the current room
     * 4th card becomes carry card for next room
     */
    endRoom() {
        // Find the unresolved card (4th card) to carry forward
        const unresolved = this.state.room.find(card => !card.resolved);
        if (unresolved) {
            this.state.carryCard = unresolved;
            if (this.ui) {
                this.ui.log(`Carrying ${unresolved.suit}${unresolved.rank} to next room.`, 'info');
            }
        }
        
        // Clear room and reset facing state
        this.state.room = [];
        this.state.facingRoom = false;
        
        // Check if deck is empty (win condition)
        if (this.state.deck.length === 0 && !this.state.carryCard) {
            this.state.won = true;
            this.endGame();
        } else {
            this.drawRoom();
        }
    }
    
    /**
     * End the game
     * Win: Clear dungeon → score = health
     * Lose: Health ≤ 0 → score = -(sum of remaining monster values)
     */
    endGame() {
        this.state.gameOver = true;
        
        if (this.state.health <= 0) {
            // Loss - calculate negative score
            const remainingMonsters = [...this.state.deck, ...this.state.room]
                .filter(c => c.type === CARD_TYPES.MONSTER)
                .reduce((sum, c) => sum + c.value, 0);
            this.state.score = -remainingMonsters;
            this.state.won = false;
            
            if (this.ui) {
                this.ui.log(`Game Over! You fell in the dungeon. Score: ${this.state.score}`, 'damage');
            }
        } else {
            // Win - score is remaining health
            this.state.score = this.state.health;
            this.state.won = true;
            
            if (this.ui) {
                this.ui.log(`Victory! You cleared the dungeon! Score: ${this.state.score}`, 'heal');
            }
        }
        
        this.saveState();
        
        if (this.ui) {
            this.ui.showGameOver();
        }
    }
    
    /**
     * Save game state to LocalStorage
     */
    saveState() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state.serialize()));
        } catch (e) {
            console.warn('Could not save game state:', e);
        }
    }
    
    /**
     * Load game state from LocalStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.state.deserialize(data);
                return true;
            }
        } catch (e) {
            console.warn('Could not load game state:', e);
        }
        return false;
    }
}

// ============================================
// UI RENDERING
// ============================================

class GameUI {
    constructor(game) {
        this.game = game;
        game.ui = this;
        this.elements = {};
        this.initializeElements();
        this.attachEventListeners();
        this.loadAndRender();
    }
    
    /**
     * Cache DOM elements
     */
    initializeElements() {
        this.elements = {
            healthBar: document.getElementById('health-bar'),
            healthText: document.getElementById('health-text'),
            weaponValue: document.getElementById('weapon-value'),
            weaponDefeated: document.getElementById('weapon-defeated'),
            turnCounter: document.getElementById('turn-counter'),
            deckCount: document.getElementById('deck-count'),
            discardCount: document.getElementById('discard-count'),
            gameStatus: document.getElementById('game-status'),
            roomGrid: document.getElementById('room-grid'),
            avoidBtn: document.getElementById('avoid-btn'),
            actionLog: document.getElementById('action-log'),
            newGameBtn: document.getElementById('new-game-btn'),
            restartBtn: document.getElementById('restart-btn'),
            helpBtn: document.getElementById('help-btn'),
            debugBtn: document.getElementById('debug-btn'),
            helpModal: document.getElementById('help-modal'),
            modalClose: document.getElementById('modal-close'),
            gameoverModal: document.getElementById('gameover-modal'),
            gameoverResult: document.getElementById('gameover-result'),
            gameoverScore: document.getElementById('gameover-score'),
            gameoverDetails: document.getElementById('gameover-details'),
            gameoverNew: document.getElementById('gameover-new'),
            gameoverClose: document.getElementById('gameover-close'),
            debugPanel: document.getElementById('debug-panel'),
            debugSeed: document.getElementById('debug-seed'),
            debugDeck: document.getElementById('debug-deck'),
            debugCarry: document.getElementById('debug-carry'),
            debugPotion: document.getElementById('debug-potion'),
            debugAvoid: document.getElementById('debug-avoid'),
            debugResolved: document.getElementById('debug-resolved')
        };
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.elements.newGameBtn.addEventListener('click', () => this.game.newGame());
        this.elements.restartBtn.addEventListener('click', () => this.game.restart());
        this.elements.helpBtn.addEventListener('click', () => this.showHelp());
        this.elements.modalClose.addEventListener('click', () => this.hideHelp());
        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) this.hideHelp();
        });
        this.elements.avoidBtn.addEventListener('click', () => this.game.avoidRoom());
        this.elements.debugBtn.addEventListener('click', () => this.toggleDebug());
        this.elements.gameoverNew.addEventListener('click', () => {
            this.hideGameOver();
            this.game.newGame();
        });
        this.elements.gameoverClose.addEventListener('click', () => this.hideGameOver());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboard(e) {
        // Close modals with Escape
        if (e.key === 'Escape') {
            if (!this.elements.helpModal.hidden) {
                this.hideHelp();
            } else if (!this.elements.gameoverModal.hidden) {
                this.hideGameOver();
            }
        }
        
        // Number keys 1-4 to select cards
        if (['1', '2', '3', '4'].includes(e.key)) {
            const index = parseInt(e.key) - 1;
            this.game.selectCard(index);
        }
        
        // A key to avoid
        if (e.key === 'a' || e.key === 'A') {
            if (!this.elements.avoidBtn.disabled) {
                this.game.avoidRoom();
            }
        }
    }
    
    /**
     * Load saved state and render
     */
    loadAndRender() {
        if (this.game.loadState()) {
            this.log('Game loaded from save.', 'info');
            this.render();
        }
    }
    
    /**
     * Main render function - updates all UI elements
     */
    render() {
        this.renderHealth();
        this.renderWeapon();
        this.renderCounters();
        this.renderRoom();
        this.renderAvoidButton();
        this.renderStatus();
        this.renderDebug();
    }
    
    /**
     * Render health bar
     */
    renderHealth() {
        const health = this.game.state.health;
        const maxHealth = CONFIG.MAX_HEALTH;
        const percentage = (health / maxHealth) * 100;
        
        this.elements.healthBar.style.width = `${percentage}%`;
        this.elements.healthBar.setAttribute('aria-valuenow', health);
        this.elements.healthText.textContent = `${health}/${maxHealth}`;
        
        // Update health bar color class
        this.elements.healthBar.classList.remove('medium', 'low');
        if (health <= 5) {
            this.elements.healthBar.classList.add('low');
        } else if (health <= 10) {
            this.elements.healthBar.classList.add('medium');
        }
    }
    
    /**
     * Render weapon display
     */
    renderWeapon() {
        const weapon = this.game.state.weapon;
        
        if (weapon) {
            this.elements.weaponValue.textContent = `♦${weapon.value}`;
            if (weapon.lastDefeated !== null) {
                this.elements.weaponDefeated.textContent = `Last defeated: ${weapon.lastDefeated}`;
            } else {
                this.elements.weaponDefeated.textContent = 'No kills yet';
            }
        } else {
            this.elements.weaponValue.textContent = '—';
            this.elements.weaponDefeated.textContent = 'No weapon equipped';
        }
    }
    
    /**
     * Render turn and deck counters
     */
    renderCounters() {
        this.elements.turnCounter.textContent = this.game.state.turn;
        this.elements.deckCount.textContent = this.game.state.deck.length;
        
        // Count resolved cards (cards that have been defeated/used)
        const resolvedCount = CONFIG.INITIAL_DECK_SIZE - this.game.state.deck.length - this.game.state.room.filter(c => c).length;
        this.elements.discardCount.textContent = resolvedCount;
        
        // Update deck pile overlay
        const deckOverlay = document.getElementById('deck-count-overlay');
        if (deckOverlay) {
            deckOverlay.textContent = this.game.state.deck.length;
        }
    }
    
    /**
     * Render the room (4 cards)
     */
    renderRoom() {
        const room = this.game.state.room;
        const cards = this.elements.roomGrid.querySelectorAll('.card');
        
        cards.forEach((cardEl, index) => {
            const card = room[index];
            
            // Remove all previous classes and handlers
            cardEl.onclick = null;
            cardEl.onkeydown = null;
            
            if (card && !card.resolved) {
                // Show card face with image
                cardEl.classList.remove('card-back', 'resolved');
                cardEl.classList.add('flip', card.type);
                
                // Add drawing animation for newly drawn cards
                if (!cardEl.classList.contains('flip')) {
                    cardEl.classList.add('drawing');
                    // Remove drawing class after animation completes
                    setTimeout(() => {
                        cardEl.classList.remove('drawing');
                    }, 700);
                }
                
                cardEl.setAttribute('aria-label', `${card.type} ${card.suit}${card.rank}, value ${card.value}`);
                cardEl.setAttribute('tabindex', '0');
                
                // Update front face with card image and value corners
                const front = cardEl.querySelector('.card-front');
                front.innerHTML = `
                    <img src="scoundrel-images/${card.image}" alt="${card.suit}${card.rank}">
                    <span class="card-corner top-right">${card.rank}</span>
                    <span class="card-corner bottom-left">${card.rank}</span>
                `;
                
                // Add click handler for unresolved cards only
                cardEl.onclick = () => this.game.selectCard(index);
                cardEl.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.game.selectCard(index);
                    }
                };
            } else if (card && card.resolved) {
                // Show as resolved (faded out)
                cardEl.classList.remove('card-back', 'flip', 'drawing');
                cardEl.classList.add('resolved');
                cardEl.setAttribute('aria-label', 'Resolved card');
                cardEl.removeAttribute('tabindex');
            } else {
                // Empty slot - show nothing (removed card-back)
                cardEl.classList.remove('card-back', 'flip', 'monster', 'weapon', 'potion', 'resolved', 'drawing');
                cardEl.setAttribute('aria-label', 'Empty card slot');
                cardEl.removeAttribute('tabindex');
            }
        });
    }
    
    /**
     * Render avoid button state
     */
    renderAvoidButton() {
        const canAvoid = this.game.canAvoid() && 
                        this.game.state.room.some(c => !c.resolved) &&
                        !this.game.state.gameOver;
        
        this.elements.avoidBtn.disabled = !canAvoid;
        
        if (this.game.state.lastAction === 'avoid') {
            this.elements.avoidBtn.textContent = 'Cannot Avoid (last turn)';
        } else if (this.game.state.facingRoom) {
            this.elements.avoidBtn.textContent = 'Cannot Avoid (facing room)';
        } else {
            this.elements.avoidBtn.textContent = 'Avoid Room';
        }
    }
    
    /**
     * Render game status message
     */
    renderStatus() {
        const state = this.game.state;
        
        if (state.gameOver) {
            if (state.won) {
                this.elements.gameStatus.textContent = `Victory! You cleared the dungeon with ${state.health} health!`;
                this.elements.gameStatus.style.color = 'var(--color-success)';
            } else {
                this.elements.gameStatus.textContent = `Game Over! You fell in the dungeon. Score: ${state.score}`;
                this.elements.gameStatus.style.color = 'var(--color-danger)';
            }
        } else {
            const remaining = state.cardsResolvedThisRoom;
            const needed = CONFIG.CARDS_TO_RESOLVE;
            
            if (state.facingRoom) {
                this.elements.gameStatus.textContent = `Facing room: ${remaining}/${needed} cards resolved`;
            } else if (remaining < needed) {
                this.elements.gameStatus.textContent = `Select a card to resolve (${remaining}/${needed} resolved)`;
            } else {
                this.elements.gameStatus.textContent = 'Room complete! Drawing next room...';
            }
            this.elements.gameStatus.style.color = 'var(--color-text-primary)';
        }
    }
    
    /**
     * Add entry to action log
     */
    log(message, type = '') {
        const entry = document.createElement('p');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        
        this.elements.actionLog.insertBefore(entry, this.elements.actionLog.firstChild);
        
        // Limit log entries
        while (this.elements.actionLog.children.length > 50) {
            this.elements.actionLog.removeChild(this.elements.actionLog.lastChild);
        }
    }
    
    /**
     * Show help modal
     */
    showHelp() {
        this.elements.helpModal.hidden = false;
        this.elements.modalClose.focus();
    }
    
    /**
     * Hide help modal
     */
    hideHelp() {
        this.elements.helpModal.hidden = true;
        this.elements.helpBtn.focus();
    }
    
    /**
     * Show game over modal
     */
    showGameOver() {
        const state = this.game.state;
        
        if (state.won) {
            this.elements.gameoverResult.textContent = 'Victory!';
            this.elements.gameoverResult.className = 'gameover-result win';
            this.elements.gameoverScore.textContent = `Final Score: ${state.score}`;
            this.elements.gameoverDetails.textContent = `You cleared the dungeon with ${state.health} health remaining!`;
        } else {
            this.elements.gameoverResult.textContent = 'Defeated!';
            this.elements.gameoverResult.className = 'gameover-result lose';
            this.elements.gameoverScore.textContent = `Final Score: ${state.score}`;
            
            // Calculate remaining monster value
            const remainingMonsters = [...state.deck, ...state.room]
                .filter(c => c.type === CARD_TYPES.MONSTER)
                .reduce((sum, c) => sum + c.value, 0);
            
            this.elements.gameoverDetails.innerHTML = `
                You fell in the dungeon with ${state.health} health.<br>
                Remaining monster value: ${remainingMonsters}
            `;
        }
        
        this.elements.gameoverModal.hidden = false;
        this.elements.gameoverNew.focus();
    }
    
    /**
     * Hide game over modal
     */
    hideGameOver() {
        this.elements.gameoverModal.hidden = true;
    }
    
    /**
     * Toggle debug panel
     */
    toggleDebug() {
        this.elements.debugPanel.hidden = !this.elements.debugPanel.hidden;
        if (!this.elements.debugPanel.hidden) {
            this.renderDebug();
        }
    }
    
    /**
     * Render debug panel
     */
    renderDebug() {
        if (this.elements.debugPanel.hidden) return;
        
        const state = this.game.state;
        
        this.elements.debugSeed.textContent = state.seed !== null ? state.seed : 'Random';
        this.elements.debugDeck.textContent = state.deck.map(c => c.id).join(', ');
        this.elements.debugCarry.textContent = state.carryCard ? state.carryCard.id : 'None';
        this.elements.debugPotion.textContent = state.usedPotionThisRoom ? 'Yes' : 'No';
        this.elements.debugAvoid.textContent = this.game.canAvoid() ? 'Yes' : 'No';
        this.elements.debugResolved.textContent = `${state.cardsResolvedThisRoom}/${CONFIG.CARDS_TO_RESOLVE}`;
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const ui = new GameUI(game);
    
    // Make game accessible globally for debugging
    window.scoundrelGame = game;
    window.scoundrelUI = ui;
});