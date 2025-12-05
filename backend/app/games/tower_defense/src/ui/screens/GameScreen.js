export class GameScreen {
  constructor(root) {
    this.root = root;
    this.el = document.createElement("div");
    this.el.className = "screen-root game-screen";
    this.el.style.pointerEvents = "none";
    this.root.appendChild(this.el);
    
    // Il GameScreen è principalmente trasparente per permettere l'interazione con il canvas
    // L'HUD viene gestito dal HUDView e BottomBarView che sono nel hudLayer
  }
  
  dispose() {
    if (this.el && this.el.parentElement) {
      this.el.parentElement.removeChild(this.el);
    }
  }
}

