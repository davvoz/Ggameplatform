/**
 * Immutable description of one animation clip living inside a SpriteSheet.
 *  - sheetId    : which SpriteSheet to read frames from
 *  - start      : index of first frame (inclusive)
 *  - count      : number of frames in this clip
 *  - fps        : playback speed (frames per second)
 *  - loop       : true => loops forever; false => holds last frame on completion
 */
export class AnimationDef {
    constructor({ id, sheetId, start, count, fps, loop }) {
        if (!id || typeof id !== 'string') throw new Error('AnimationDef: id required');
        if (!sheetId || typeof sheetId !== 'string') throw new Error(`AnimationDef "${id}": sheetId required`);
        if (!Number.isFinite(start) || start < 0) throw new Error(`AnimationDef "${id}": start must be >= 0`);
        if (!Number.isFinite(count) || count <= 0) throw new Error(`AnimationDef "${id}": count must be > 0`);
        if (!Number.isFinite(fps) || fps <= 0) throw new Error(`AnimationDef "${id}": fps must be > 0`);
        if (typeof loop !== 'boolean') throw new Error(`AnimationDef "${id}": loop must be boolean`);
        this.id = id;
        this.sheetId = sheetId;
        this.start = start;
        this.count = count;
        this.fps = fps;
        this.loop = loop;
        Object.freeze(this);
    }

    get duration() { return this.count / this.fps; }
}
