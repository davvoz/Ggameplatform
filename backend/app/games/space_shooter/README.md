# 🚀 Space Shooter

Un gioco shoot 'em up verticale realizzato in JavaScript puro, OOP e mobile-first.

## 🎮 Come Giocare

### Desktop
- **WASD** o **Frecce**: Muovi la navicella
- **Spazio**: Spara

### Mobile
- **Joystick virtuale** (sinistra): Muovi la navicella
- **Pulsante FIRE** (destra): Spara

## 🏗️ Struttura del Progetto

```
navicelle/
├── index.html              # Entry point HTML
├── css/
│   └── style.css          # Stili responsive e mobile-first
├── js/
│   ├── main.js            # Entry point JavaScript
│   ├── Game.js            # Classe principale del gioco
│   ├── utils/
│   │   └── Vector2.js     # Operazioni vettoriali 2D
│   ├── managers/
│   │   ├── AssetManager.js    # Caricamento e gestione sprite
│   │   ├── InputManager.js    # Input tastiera e touch
│   │   └── SoundManager.js    # Effetti sonori (Web Audio API)
│   └── entities/
│       ├── GameObject.js  # Classe base per tutti gli oggetti
│       ├── Player.js      # Navicella del giocatore
│       ├── Enemy.js       # Nemici e boss
│       ├── Bullet.js      # Proiettili
│       ├── Explosion.js   # Effetti esplosione
│       ├── PowerUp.js     # Potenziamenti
│       └── Star.js        # Sfondo stellare parallax
└── assets/
    ├── spritesheet.png    # (Opzionale) Spritesheet personale
    └── font.png           # (Opzionale) Font bitmap
```

## ✨ Caratteristiche

- **OOP Design**: Architettura object-oriented con classi ben separate
- **Mobile-First**: Controlli touch ottimizzati con joystick virtuale
- **Scalabile**: Sistema di wave, livelli progressivi e boss fight
- **Sprite Procedurali**: Funziona anche senza asset esterni
- **Audio Sintetizzato**: Effetti sonori generati con Web Audio API
- **Parallax Starfield**: Sfondo stellare animato su più layer
- **Sistema Power-Up**: Upgrade armi e salute
- **Responsive**: Si adatta a qualsiasi schermo

## 🚀 Come Avviare

### Metodo 1: Live Server (VS Code)
1. Installa l'estensione "Live Server"
2. Click destro su `index.html` → "Open with Live Server"

### Metodo 2: Python
```bash
cd navicelle
python -m http.server 8080
```
Poi apri http://localhost:8080

### Metodo 3: Node.js
```bash
npx serve .
```

## 🎯 Gameplay

- **Nemici**: 3 tipi base + Boss ogni 10 wave
- **Pattern**: Movimento dritto, sinusoidale, zigzag, dive
- **Livelli**: Difficoltà progressiva
- **Power-Up**: 
  - 🟢 **Health**: Recupera 1 vita
  - 🟠 **Weapon**: Potenzia l'arma (5 livelli)

## 📱 Supporto Browser

- Chrome (Desktop/Mobile) ✅
- Firefox ✅
- Safari (iOS) ✅
- Edge ✅

## 🛠️ Estendibilità

Il gioco è progettato per essere facilmente estendibile:

### Aggiungere un nuovo nemico
```javascript
// In Enemy.js, aggiungi stats in initStats()
'enemy4': { health: 6, speed: 60, score: 600, shootInterval: 1 }

// Aggiungi sprite in AssetManager.js
this.generatedSprites.set('enemy4', this.createEnemySprite('#purple', 80));
```

### Aggiungere un nuovo power-up
```javascript
// In PowerUp.js, nel metodo apply()
case 'speed':
    player.speed *= 1.5;
    break;
```

### Aggiungere pattern di movimento
```javascript
// In Enemy.js, nel metodo update()
case 'spiral':
    const angle = this.movementTimer * 2;
    this.position.x = this.startX + Math.cos(angle) * this.amplitude;
    this.velocity.y = this.speed;
    break;
```

## 📝 Note per gli Spritesheet

Se vuoi usare i tuoi spritesheet:
1. Salva le immagini nella cartella `assets/`
2. Modifica `defineSprites()` in `AssetManager.js` con le coordinate corrette
3. Gli sprite procedurali sono usati come fallback se le immagini non caricano

## 📄 Licenza

MIT License - Usa liberamente per scopi personali o commerciali.
