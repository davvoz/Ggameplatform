export class GameOverScreen {
  constructor(root, { onRestart, onMenu, soundLibrary }) {
    this.root = root;
    this.onRestart = onRestart;
    this.onMenu = onMenu;
    this.soundLibrary = soundLibrary;

    this.overlay = null;
  }

  show() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'skill-popup-overlay';
    this.overlay.style.zIndex = '2000';
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'skill-popup';
    popup.style.maxWidth = '500px';
    popup.style.textAlign = 'center';
    
    // Header
    const header = document.createElement('div');
    header.className = 'skill-popup-header';
    
    const title = document.createElement('div');
    title.className = 'skill-popup-title';
    title.textContent = 'GAME OVER';
    title.style.color = '#ff6464';
    title.style.fontSize = '2rem';
    title.style.marginBottom = '1rem';
    
    const subtitle = document.createElement('div');
    subtitle.className = 'skill-popup-subtitle';
    subtitle.textContent = 'La tua base è stata distrutta!';
    subtitle.style.fontSize = '1rem';
    subtitle.style.marginBottom = '2rem';
    
    header.appendChild(title);
    header.appendChild(subtitle);
    
    // Buttons
    const footer = document.createElement('div');
    footer.className = 'skill-popup-footer';
    footer.style.flexDirection = 'column';
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'tower-action-btn';
    restartBtn.innerHTML = '<span>🔄</span> Rigioca';
    restartBtn.style.width = '100%';
    restartBtn.style.justifyContent = 'center';
    restartBtn.style.padding = '1rem';
    restartBtn.style.fontSize = '1rem';
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'skill-popup-close';
    menuBtn.innerHTML = '<span>🏠</span> Menu Principale';
    menuBtn.style.display = 'flex';
    menuBtn.style.alignItems = 'center';
    menuBtn.style.justifyContent = 'center';
    menuBtn.style.gap = '0.5rem';
    menuBtn.style.padding = '1rem';
    
    const handleRestart = () => {
      if (this.soundLibrary) {
        this.soundLibrary.success();
      }
      this.hide();
      this.onRestart();
    };
    
    const handleMenu = () => {
      if (this.soundLibrary) {
        this.soundLibrary.hover();
      }
      this.hide();
      this.onMenu();
    };
    
    restartBtn.addEventListener('click', handleRestart);
    restartBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleRestart();
    });
    
    menuBtn.addEventListener('click', handleMenu);
    menuBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleMenu();
    });
    
    // Hover effects
    restartBtn.addEventListener('mouseenter', () => {
      if (this.soundLibrary) {
        this.soundLibrary.hover();
      }
    });
    
    menuBtn.addEventListener('mouseenter', () => {
      if (this.soundLibrary) {
        this.soundLibrary.hover();
      }
    });
    
    footer.appendChild(restartBtn);
    footer.appendChild(menuBtn);
    
    popup.appendChild(header);
    popup.appendChild(footer);
    this.overlay.appendChild(popup);
    this.root.appendChild(this.overlay);
  }

  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  dispose() {
    this.hide();
  }
}
