# Scoundrel - Solo Dungeon-Crawl Card Game

A polished browser-based implementation of the solo card game Scoundrel, built as a portfolio project with vanilla HTML, CSS, and JavaScript.

![Scoundrel Game](scoundrel-images/deck.jpg)

## 🎮 Game Overview

Scoundrel is a solo dungeon-crawl card game where you navigate through rooms of cards, fighting monsters with weapons, and healing with potions. Your goal is to survive through the entire dungeon deck without losing all your health.

**Win Condition:** Clear all cards from the dungeon deck. Your score equals your remaining health.

**Lose Condition:** Your health drops to 0 or below. Your score is the negative sum of remaining monster values.

## 📋 Rules

### Card Types

| Card Type | Suit | Range | Description |
|-----------|------|-------|-------------|
| **Monsters** | ♣ ♠ | 2-A (2-14) | Deal damage equal to their value |
| **Weapons** | ♦ | 2-10 | Reduce damage from monsters |
| **Potions** | ♥ | 2-10 | Heal by their value (max 20 HP) |

### Deck Composition (44 Cards)

- **26 Monsters:** All clubs and spades (2-10, J=11, Q=12, K=13, A=14)
- **9 Weapons:** Diamonds 2-10
- **9 Potions:** Hearts 2-10

*Excluded: Jokers, red face cards (J/Q/K of ♥♦), red Aces (A♥, A♦)*

### Gameplay Loop

1. **Draw Room:** Each turn, draw cards until 4 are visible (the Room)
2. **Choose Action:**
   - **Avoid Room:** Place all 4 cards at the bottom of the deck (cannot do this twice in a row!)
   - **Face Room:** Resolve 3 of the 4 cards in any order
3. **Carry Forward:** The 4th card becomes the first card of the next Room

### Resolving Cards

#### Weapons (♦)
- Equip immediately when selected
- **Discards your old weapon** and its defeated monster stack
- Resets weapon history (can fight any monster initially)

#### Potions (♥)
- Heal by the potion's value
- **One potion per Room limit:** Additional potions are discarded without effect
- Health is capped at 20

#### Monsters (♣/♠)
- **Bare-handed:** Take full monster value as damage
- **With weapon:** Damage = max(0, monster value - weapon value)
- **Weapon Rule:** Can only use a weapon against monsters ≤ the last defeated monster's value

### Weapon Rule Explained

The weapon rule creates a "non-increasing sequence" constraint:

```
Example:
- Equip ♦7, no monsters defeated yet → Can fight ANY monster
- Fight ♣9: Take 2 damage (9-7=2), last defeated = 9
- Fight ♣5: Take 0 damage (5-7=-2→0), last defeated = 5
- Fight ♣8: CANNOT use weapon! (8 > 5) Must fight bare-handed, take 8 damage
```

**Strategy Tip:** Fight larger monsters first to maintain weapon usability!

## 🎯 Controls

### Mouse
- Click on cards to select and resolve them
- Click buttons to perform actions

### Keyboard
- **1-4:** Select card in position 1-4
- **A:** Avoid the room (if allowed)
- **Escape:** Close modals
- **Tab:** Navigate between elements

## 🚀 How to Run

### Option 1: Direct File Opening
1. Download or clone this repository
2. Navigate to the `Scoundrel Game` folder
3. Double-click `index.html` to open in your browser

### Option 2: Local Server (Recommended)
```bash
# Using Python
cd "Scoundrel Game"
python -m http.server 8000

# Using Node.js (npx)
cd "Scoundrel Game"
npx serve .

# Then open http://localhost:8000 in your browser
```

### Option 3: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📁 File Structure

```
Scoundrel Game/
├── index.html          # HTML structure and layout
├── styles.css          # All styling, animations, responsive design
├── game.js            # Complete game logic and UI rendering
├── README.md          # This file
└── scoundrel-images/  # Card images
    ├── club-*.jpg     # Monster cards (clubs)
    ├── spade-*.jpg    # Monster cards (spades)
    ├── diamond-*.jpg  # Weapon cards
    ├── heart.jpg      # Potion cards
    └── deck.jpg       # Card back
```

### File Responsibilities

#### `index.html`
- Defines the game layout structure
- HUD (Health, Weapon, Turn, Deck count)
- Room grid for 4 cards
- Action log section
- Help and Game Over modals
- Debug panel (hidden by default)
- All ARIA labels for accessibility

#### `styles.css`
- CSS custom properties (theme colors)
- Responsive grid layout
- Card flip animations
- Health bar styling with color states
- Modal animations
- Focus styles for accessibility
- Reduced motion support
- High contrast mode support

#### `game.js`
- `GameState` class: Manages all game state
- `Game` class: Core game logic
  - Deck building and shuffling (Fisher-Yates)
  - Room drawing and card resolution
  - Combat system with weapon rules
  - Potion restrictions
  - Avoid mechanics
  - Win/loss detection
  - Score calculation
  - LocalStorage persistence
- `GameUI` class: DOM manipulation and rendering
  - Event handling
  - Keyboard navigation
  - Modal management
  - Action logging

## 🎨 Features

### Implemented
- ✅ Complete Scoundrel game rules
- ✅ Fisher-Yates shuffle with optional seed
- ✅ Card flip animations
- ✅ Responsive design (mobile-first)
- ✅ Keyboard navigation
- ✅ ARIA labels for screen readers
- ✅ Prefers-reduced-motion support
- ✅ LocalStorage game persistence
- ✅ Restart with same seed
- ✅ Action log with color coding
- ✅ Help modal with complete rules
- ✅ Game over screen with score
- ✅ Debug panel (toggle with 🐛 button)
- ✅ Health bar with color states
- ✅ Weapon tracking with last defeated

### Accessibility Features
- Full keyboard operability
- Visible focus indicators
- ARIA live regions for game log
- ARIA labels on all interactive elements
- Screen reader friendly
- Respects `prefers-reduced-motion`
- High contrast mode support

## 🐛 Debug Panel

Click the 🐛 button in the header to reveal the debug panel showing:
- **Seed:** Random seed used for shuffle (or "Random")
- **Deck Order:** Current remaining cards
- **Carry Card:** Card carried from previous room
- **Used Potion:** Whether potion was used this room
- **Can Avoid:** Whether avoid is currently allowed
- **Cards Resolved:** Progress in current room

## 💾 Persistence

Game state automatically saves to LocalStorage after each action. When you return to the page, your game will resume where you left off.

To start fresh, click "New Game". To replay the same card arrangement, click "Restart".

## 🎯 Strategy Tips

1. **Plan your card order carefully** - The 4th card carries over!
2. **Fight monsters in decreasing order** - Maintains weapon usability
3. **Use potions strategically** - Only one per room, so pick the best timing
4. **Don't be afraid to avoid** - Sometimes it's better to skip a bad room
5. **Track your weapon's limit** - Know which monsters you can still fight
6. **Save high potions for emergencies** - Don't waste healing when at full health

## 📊 Scoring

- **Win:** Score = Remaining health (1-20 points)
- **Lose:** Score = -(Sum of remaining monster values)

A perfect game would score 20 points (clear the dungeon with full health).

## 🔧 Technical Details

- **Pure vanilla JavaScript** - No frameworks or dependencies
- **CSS Custom Properties** - Easy theming and maintenance
- **ES6+ Classes** - Clean, modular code organization
- **LocalStorage API** - Game state persistence
- **CSS Grid & Flexbox** - Responsive layouts
- **CSS Animations** - Smooth card flips and transitions

## 📝 License

This project is created as a portfolio piece. Feel free to use it for learning purposes.

## 🙏 Credits

Scoundrel card game designed by Zach Gage and Kurt Bieg.

---

**Enjoy your dungeon crawl! 🗡️🛡️💊**