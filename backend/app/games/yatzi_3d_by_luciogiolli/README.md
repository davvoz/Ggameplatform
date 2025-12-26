# Yatzi 3D - Integration Documentation

## 🎲 Game Overview
Yatzi 3D is a classic dice game with realistic 3D physics and AI opponent. Players roll five dice and score combinations across 13 categories to beat the computer.

## 📁 Game Location
- **Path**: `backend/app/games/yatzi_3d_by_luciogiolli/`
- **Entry Point**: `index.html`
- **Game ID**: `yatzi_3d`

## 🔧 Integration Components

### 1. SDK Integration
The game has been integrated with the platform SDK for:
- **Session Management**: Automatically starts session on first dice roll
- **Score Tracking**: Sends final score when game ends
- **Extra Data**: Tracks AI score, winner, and rounds played

**Key Files Modified**:
- `main.js`: Added SDK initialization and score tracking
- `index.html`: Added platform SDK script reference

### 2. Database Setup Scripts

#### `setup_yatzi_3d.py`
Master setup script that orchestrates the complete integration:
- Registers game in `games` table
- Calls thumbnail creation
- Calls XP rules creation
- Calls quest creation

**Usage**:
```bash
cd backend
python scripts/setup_yatzi_3d.py
```

#### `create_yatzi_thumbnail.py`
Creates a 400x300 PNG thumbnail featuring:
- Casino green felt background
- Five dice showing "5" (classic Yatzi)
- Gold "YATZI 3D" title
- Professional gaming aesthetic

**Output**: `backend/app/static/game_thumbnails/yatzi_3d.png`

#### `create_yatzi_xp_rules.py`
Creates 9 XP rules for the game:
- **Completion**: 20 XP for completing a game
- **Win**: 30 XP for beating AI
- **Score Tiers**: 10-50 XP based on score (100-300+)
- **Perfect Game**: 100 XP for scoring 375 points
- **Upper Bonus**: 15 XP for getting upper section bonus

#### `create_yatzi_quests.py`
Creates 10 quests for player progression:
- First Game, Novice Player (gameplay tracking)
- First Victory, Winning Streak (win tracking)
- High Score challenges (200+, 250+ points)
- Upper Bonus achievement
- Special combinations (Yatzi, Full House, Large Straight)

### 3. Game Registration

**Database Entry** (`games` table):
```python
{
    'game_id': 'yatzi_3d',
    'title': 'Yatzi 3D',
    'description': 'Classic dice game with 3D physics...',
    'category': 'dice',
    'thumbnail': 'yatzi_3d.png',
    'entry_point': 'index.html',
    'author': 'Ggameplatform',
    'version': '1.0.0',
    'tags': '["dice","strategy","3d","yatzi","yahtzee","casual"]',
    'steem_rewards_enabled': 0
}
```

## 🎮 SDK Implementation Details

### Session Flow
1. **SDK Initialization**: Called on page load via `initSDK()`
2. **Session Start**: Triggered on first dice roll via `startGameSession()`
3. **Score Submission**: Sent when game ends via `sendScoreToPlatform()`

### Score Data Structure
```javascript
{
    score: playerScore,  // Player's final score
    extra_data: {
        ai_score: aiScore,           // AI opponent's score
        winner: 'player|ai|tie',     // Game outcome
        rounds_played: 13            // Number of categories filled
    }
}
```

## 📊 XP & Rewards System

### XP Earning Opportunities
- **Per Game**: 20-50 XP (completion + tier bonuses)
- **Winning**: +30 XP bonus
- **High Scores**: 10-50 XP based on performance
- **Perfect Game**: +100 XP (very rare)

### Quest System
Players can earn additional rewards by:
- Playing multiple games
- Achieving win streaks
- Reaching score milestones
- Rolling special combinations

## 🚀 Deployment Checklist

- [x] SDK integrated in main.js
- [x] SDK script added to index.html
- [x] Session management implemented
- [x] Score tracking configured
- [x] Thumbnail created
- [x] XP rules defined
- [x] Quests created
- [x] Game registered in database
- [x] Documentation completed

## 🧪 Testing

### Manual Testing Steps
1. **Open Game**: Navigate to `/app/games/yatzi_3d_by_luciogiolli/`
2. **Check SDK**: Verify "Platform SDK initialized" in console
3. **Start Game**: Roll first dice, check for "Game session started" message
4. **Complete Game**: Play until end, verify score is sent
5. **Check Database**: Verify session and score in `game_sessions` table

### Console Messages to Expect
```
📡 Platform SDK initialized for Yatzi 3D
🎮 Game session started for Yatzi 3D
📊 Score sent: Player=234, AI=198
```

## 🔍 Game Mechanics

### Scoring Categories
**Upper Section** (63+ = 35 point bonus):
- Ones, Twos, Threes, Fours, Fives, Sixes

**Lower Section**:
- Tris (3 of a kind): Sum of all dice
- Poker (4 of a kind): Sum of all dice
- Full (Full house): 25 points
- Scala piccola (Small straight): 30 points
- Scala grande (Large straight): 40 points
- Yatzi (5 of a kind): 50 points
- Chance: Sum of all dice

### Gameplay
- 13 rounds total (one per category)
- 3 rolls per round
- Can hold/release dice between rolls
- AI opponent with intelligent strategy
- Score must beat AI to win

## 📝 Notes

### Simplicity
This game is simpler than others like Seven or Rainbow Rush:
- Single-player only
- No real-time multiplayer
- No complex state management
- Straightforward turn-based gameplay

### SDK Usage
Follows the same pattern as other games but simpler:
- `blocky-road`: Continuous scoring, real-time gameplay
- `seven`: Betting system, multiple rounds
- `yatzi_3d`: Single session, final score only ✓ (simplest)

## 🐛 Troubleshooting

### SDK Not Initializing
- Check that `platform-sdk.js` path is correct: `../../sdk/platform-sdk.js`
- Verify SDK file exists in `backend/sdk/`

### Score Not Tracking
- Check browser console for errors
- Verify `sendScoreToPlatform()` is called in `updateUI()` when `gameOver` is true
- Confirm session was started (check console logs)

### Quests Not Triggering
- Ensure game_id matches exactly: `yatzi_3d`
- Verify quest config JSON has correct structure
- Check quest tracking in backend logs

## 🎯 Future Enhancements

Potential improvements:
- [ ] Add sound effects (dice rolling, scoring)
- [ ] Multiplayer support (vs other players)
- [ ] Daily challenges
- [ ] Custom dice skins
- [ ] Statistics/history tracking
- [ ] Achievements system
- [ ] Leaderboards

---

**Created**: December 26, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
