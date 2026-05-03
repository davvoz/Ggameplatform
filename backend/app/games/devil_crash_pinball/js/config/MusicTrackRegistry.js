/**
 * Catalogue of selectable background music tracks.
 *
 * Single source of truth — add entries here to expose more tracks.
 * Order determines display order in the MusicSelectorPanel.
 */
export class MusicTrackRegistry {
    /**
     * Ordered list of available tracks.
     * @type {ReadonlyArray<{id:string, path:string, label:string}>}
     */
    static tracks = Object.freeze([
        { id: 'pinball1', path: 'assets/background/PINBALL.mp3',  label: 'HELLFIRE'   },
        { id: 'pinball2', path: 'assets/background/PINBALL2.mp3', label: 'DEMON CORE' },
        { id: 'pinball3', path: 'assets/background/PINBALL3.mp3', label: 'ABYSS'      },
    ]);
}
