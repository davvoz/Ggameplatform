/**
 * Object Pool Pattern - Riutilizza oggetti invece di crearli/distruggerli continuamente
 * Riduce drasticamente il Garbage Collection e migliora le performance
 * 
 * Perfetto per:
 * - Proiettili che vengono sparati continuamente
 * - Effetti particellari (esplosioni, laser)
 * - Floating text (damage numbers)
 * - Nemici che spawnano in wave
 */
export class ObjectPool {
  /**
   * @param {Function} createFn - Funzione che crea un nuovo oggetto
   * @param {Function} resetFn - Funzione che resetta un oggetto per riutilizzo
   * @param {number} initialSize - Numero di oggetti da pre-allocare
   */
  constructor(createFn, resetFn, initialSize = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.available = [];
    this.active = new Set();
    
    // Pre-alloca oggetti per evitare allocazioni durante il gameplay
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  /**
   * Prendi un oggetto dal pool (o creane uno nuovo se necessario)
   */
  acquire(...args) {
    let obj;
    
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      // Pool esaurito, crea nuovo oggetto (raro in produzione)
      obj = this.createFn();
    }
    
    // Resetta l'oggetto con i nuovi parametri
    this.resetFn(obj, ...args);
    this.active.add(obj);
    
    return obj;
  }

  /**
   * Rilascia un oggetto nel pool per riutilizzo
   */
  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.available.push(obj);
      return true;
    }
    return false;
  }

  /**
   * Rilascia tutti gli oggetti attivi
   */
  releaseAll() {
    this.active.forEach(obj => this.available.push(obj));
    this.active.clear();
  }

  /**
   * Ottieni statistiche sul pool
   */
  getStats() {
    return {
      available: this.available.length,
      active: this.active.size,
      total: this.available.length + this.active.size
    };
  }

  /**
   * Pulisci completamente il pool
   */
  dispose() {
    this.available = [];
    this.active.clear();
  }
}
