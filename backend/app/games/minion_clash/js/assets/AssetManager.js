import { SpriteSheet } from './SpriteSheet.js';
import { AnimationDef } from './AnimationDef.js';
import { SpriteAnimator } from './SpriteAnimator.js';

/**
 * AssetManager — loads sprite sheets and animation definitions from
 * a JSON manifest, then serves them to the game.
 *
 * Manifest shape (sprites.json):
 *   {
 *     "basePath": "assets/spritesheets/",
 *     "sheets":     { "<sheetId>":   { "src":"...", "frameW":N, "frameH":N, "frameCount":N }, ... },
 *     "animations": { "<animId>":    { "sheetId":"...", "start":0, "count":4, "fps":6, "loop":true }, ... }
 *   }
 *
 * Behaviour:
 *  - All declared sheets must load successfully (throws on network/decode error).
 *  - All animations must reference a known sheet (throws on validation).
 *  - createAnimator(spriteRef) returns null if `spriteRef` is null/undefined
 *    OR if its prefix has no matching sheet — entities without art keep
 *    their primitive fallback rendering. This is data-driven, not a hidden fallback.
 */
export class AssetManager {
    constructor() {
        this._sheets = new Map();   // id -> SpriteSheet
        this._anims = new Map();    // id -> AnimationDef
        this._loaded = false;
    }

    async load(manifestPath) {
        const res = await fetch(manifestPath, { cache: 'no-store' });
        if (!res.ok) throw new Error(`AssetManager: failed to fetch ${manifestPath} (${res.status})`);
        const manifest = await res.json();
        const basePath = manifest.basePath ?? '';
        const sheetEntries = Object.entries(manifest.sheets ?? {});
        const animEntries  = Object.entries(manifest.animations ?? {});

        const loadJobs = sheetEntries.map(([id, def]) =>
            this._loadSheet(id, def, basePath)
        );
        const results = await Promise.allSettled(loadJobs);
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const [id] = sheetEntries[i];
            if (r.status === 'rejected') {
                // We log and continue: missing sprites should NOT crash the game.
                // Entities referencing this sheet will silently render with primitives.
                console.warn(`AssetManager: sheet "${id}" failed to load — ${r.reason?.message ?? r.reason}`);
            }
        }

        for (const [id, def] of animEntries) {
            if (!this._sheets.has(def.sheetId)) {
                // Animation referring to a sheet that didn't load: skip it.
                continue;
            }
            this._anims.set(id, new AnimationDef({ id, ...def }));
        }
        this._loaded = true;
    }

    async _loadSheet(id, def, basePath) {
        if (!def?.src) throw new Error(`sheet "${id}": missing src`);
        const url = basePath + def.src;
        const image = await this._loadImage(url);
        this._sheets.set(id, new SpriteSheet({
            id, image,
            frameW: def.frameW, frameH: def.frameH, frameCount: def.frameCount
        }));
    }

    _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`image load failed: ${url}`));
            img.src = url;
        });
    }

    /**
     * Build a per-entity animator from a `sprite` ref on a unit/hero/tower def.
     * @param {{prefix:string, scale?:number, defaultClip?:string} | null | undefined} spriteRef
     * @returns {SpriteAnimator | null}
     */
    createAnimator(spriteRef) {
        if (!spriteRef?.prefix) return null;
        // Sanity check: at least one anim with this prefix must exist.
        const idleId = `${spriteRef.prefix}_${spriteRef.defaultClip ?? 'idle'}`;
        if (!this._anims.has(idleId)) return null;
        return new SpriteAnimator({
            assets: this,
            prefix: spriteRef.prefix,
            scale: spriteRef.scale,
            defaultClip: spriteRef.defaultClip
        });
    }

    /** Lookup helpers — return undefined when missing (no throw; caller decides). */
    peekSheet(id) { return this._sheets.get(id); }
    peekAnim(id)  { return this._anims.get(id); }

    isLoaded() { return this._loaded; }
}
