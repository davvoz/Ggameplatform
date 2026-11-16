/**
 * Weather a track can be raced in. It changes the grip (the simulation),
 * how far one sees (the fog), what falls from the sky and a tint over the
 * whole scene (the renderer), and what one hears (the audio). Optional:
 * `haze`, the colour the far road fades into (else the theme's fog), and
 * `veil`, a colour laid over the sky and the scenery only.
 *
 * A new kind: an entry here, then `weather: '<key>'` on a track.
 */
export const WEATHER = {
    clear: {
        name: 'CLEAR',
        /** Its icon in the menus (render/art/Icons.js). */
        icon: 'sun',
        /**
         * Grip of the tyres, x the car's own (the STORM TIRES mod softens anything below 1):
         * how much the car holds in bends, and how hard it can pull away and brake.
         */
        grip: 1,
        /** Fog from and to, as fractions of the draw distance. */
        fogStart: 0.2,
        fogEnd: 1,
        /** What falls: null, or a kind of render/Precipitation.js and how it falls. */
        particles: null,
        /** A colour laid over the whole scene (road, scenery, cars), or null. */
        tint: null,
        /** A hiss under the engines: null, or filtered noise {f: Hz, q, v: volume}. */
        ambience: null,
    },
    drizzle: {
        name: 'DRIZZLE',
        icon: 'drizzle',
        /** Tyres hold 3/4 of the dry road: in bends, under braking and pulling away. */
        grip: 0.75,
        fogStart: 0.12,
        fogEnd: 0.85,
        particles: {
            kind: 'rain',
            /** Drops on screen at once. */
            count: 60,
            /** Pixels long, standing still and at full speed. */
            length: [3, 8],
            /** Screens a second they fall, the nearest ones. */
            fall: 1.5,
            /** Pixels sideways per pixel down (the wind). */
            slant: 0.2,
            /** At full speed, how fast drops stream away from the road's far end (x their distance, a second). */
            flow: 2.2,
            color: 'rgba(206, 220, 255, 0.7)',
            /** Splashes on the road at once, and seconds each one lasts. */
            splashes: 5,
            splashTime: 0.12,
        },
        tint: 'rgba(48, 60, 104, 0.28)',
        ambience: { f: 5200, q: 0.4, v: 0.05 },
    },
    storm: {
        name: 'STORM',
        icon: 'drizzle',
        /** Hard rain: bends, getaways and brakes all far less sure. */
        grip: 0.62,
        fogStart: 0.06,
        fogEnd: 0.62,
        particles: {
            kind: 'rain',
            count: 120,
            length: [4, 11],
            fall: 1.9,
            slant: 0.25,
            flow: 2.4,
            color: 'rgba(206, 220, 255, 0.72)',
            splashes: 12,
            splashTime: 0.1,
            /** Now and then the sky lights up: every so many seconds, a double flash. */
            lightning: { every: 7.3, alpha: 0.45 },
        },
        tint: 'rgba(30, 40, 80, 0.36)',
        ambience: { f: 3800, q: 0.35, v: 0.11 },
    },
    /** Snow falling softly: flakes drift and sway, the road holds less, the wind hums low. */
    snow: {
        name: 'SNOW',
        icon: 'snow',
        grip: 0.7,
        fogStart: 0.1,
        fogEnd: 0.8,
        particles: {
            kind: 'snow',
            count: 110,
            /** Screens a second the nearest flakes fall: far slower than rain. */
            fall: 0.32,
            slant: 0.35,
            flow: 2,
            /** Sideways sway, as a share of the height a second, and how fast it swings. */
            sway: 0.05,
            swayRate: 2.2,
            /** At full speed the flakes stream past as streaks this long (pixels, the nearest). */
            streak: 4,
            color: '#f4f8ff',
            far: 'rgba(214, 226, 250, 0.75)',
        },
        tint: 'rgba(120, 150, 210, 0.12)',
        /** Laid over the sky and the scenery (not the road): the far world softened by the snow. */
        veil: 'rgba(150, 172, 214, 0.22)',
        ambience: { f: 700, q: 0.5, v: 0.06 },
    },
    /**
     * A blizzard: driving snow sideways in the wind, the far road lost in white,
     * and gusts that turn the whole screen white for a moment.
     */
    blizzard: {
        name: 'BLIZZARD',
        icon: 'blizzard',
        grip: 0.58,
        fogStart: 0.04,
        fogEnd: 0.5,
        /** The road fades into white, not into the night. */
        haze: '#b4c2dc',
        particles: {
            kind: 'snow',
            count: 260,
            fall: 0.6,
            slant: 1.1,
            flow: 2.6,
            sway: 0.08,
            swayRate: 3.1,
            streak: 7,
            color: '#ffffff',
            far: 'rgba(222, 232, 250, 0.8)',
            /** Every so many seconds a gust: white over everything, rising and falling in `length` seconds. */
            gust: { every: 6.3, length: 1.5, alpha: 0.42, color: [228, 236, 252] },
        },
        tint: 'rgba(196, 210, 238, 0.22)',
        veil: 'rgba(180, 194, 222, 0.78)',
        ambience: { f: 900, q: 0.4, v: 0.13 },
    },
};
