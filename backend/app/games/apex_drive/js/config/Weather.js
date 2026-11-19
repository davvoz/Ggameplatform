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
    /** Clear water under the sea: far sight, bubbles rising, the hum of the deep. */
    clearWater: {
        name: 'CLEAR WATER',
        icon: 'bubbles',
        grip: 1,
        fogStart: 0.15,
        fogEnd: 0.9,
        particles: {
            kind: 'bubbles',
            count: 50,
            /** Negative: they rise. */
            fall: -0.22,
            slant: 0.05,
            flow: 1.6,
            sway: 0.03,
            swayRate: 2,
            streak: 3,
            color: 'rgba(220, 255, 255, 0.8)',
            far: 'rgba(160, 220, 240, 0.5)',
        },
        tint: null,
        ambience: { f: 420, q: 0.8, v: 0.06 },
    },
    /** Silt stirred up off the floor: the water thick and green, the road slick. */
    murky: {
        name: 'MURKY',
        icon: 'silt',
        grip: 0.86,
        fogStart: 0.06,
        fogEnd: 0.6,
        haze: '#1e3a3a',
        particles: {
            kind: 'snow',
            count: 140,
            fall: 0.05,
            slant: 0.4,
            flow: 1.8,
            sway: 0.05,
            swayRate: 0.8,
            streak: 3,
            color: '#b8b08a',
            far: 'rgba(140, 140, 110, 0.6)',
        },
        tint: 'rgba(40, 70, 50, 0.18)',
        veil: 'rgba(40, 80, 70, 0.35)',
        ambience: { f: 300, q: 0.9, v: 0.07 },
    },
    /** A storm up on the surface: the light flickering down through the waves, the sea churning. */
    surfaceStorm: {
        name: 'SURFACE STORM',
        icon: 'deepStorm',
        grip: 0.8,
        fogStart: 0.08,
        fogEnd: 0.7,
        particles: {
            kind: 'bubbles',
            count: 110,
            fall: -0.35,
            slant: 0.3,
            flow: 2,
            sway: 0.06,
            swayRate: 2.6,
            streak: 5,
            color: 'rgba(220, 255, 255, 0.85)',
            far: 'rgba(150, 210, 235, 0.5)',
            /** The lightning above, seen dimly through the water. */
            lightning: { every: 6.7, alpha: 0.22, color: [200, 240, 255] },
        },
        tint: 'rgba(10, 30, 60, 0.3)',
        ambience: { f: 260, q: 0.6, v: 0.12 },
    },
    /** Ash from the volcanoes, embers glowing in it: the air thick and red, the road gritty. */
    ashfall: {
        name: 'ASHFALL',
        icon: 'ash',
        grip: 0.9,
        fogStart: 0.12,
        fogEnd: 0.85,
        particles: {
            kind: 'snow',
            count: 120,
            fall: 0.24,
            slant: -0.3,
            flow: 2.2,
            sway: 0.04,
            swayRate: 1.6,
            streak: 5,
            /** The nearest flakes are embers; the far ones grey ash. */
            color: '#ffb04a',
            far: 'rgba(150, 110, 120, 0.7)',
        },
        tint: 'rgba(150, 40, 20, 0.14)',
        veil: 'rgba(120, 30, 30, 0.18)',
        ambience: { f: 240, q: 0.7, v: 0.09 },
    },
    /** Spores of the canyon fungus drifting thick in the air: the far world green and dim, the road slick with them. */
    spores: {
        name: 'SPORES',
        icon: 'spores',
        grip: 0.84,
        fogStart: 0.08,
        fogEnd: 0.72,
        haze: '#2c3a1c',
        particles: {
            kind: 'snow',
            count: 90,
            fall: 0.1,
            slant: 0.1,
            flow: 1.8,
            sway: 0.09,
            swayRate: 1.1,
            streak: 3,
            color: '#c8ff5a',
            far: 'rgba(150, 220, 110, 0.55)',
        },
        tint: 'rgba(60, 120, 30, 0.12)',
        veil: 'rgba(70, 120, 50, 0.3)',
        ambience: { f: 520, q: 1.2, v: 0.05 },
    },
    /** Acid rain under green lightning: the worst of it. */
    acidStorm: {
        name: 'ACID STORM',
        icon: 'acid',
        grip: 0.66,
        fogStart: 0.06,
        fogEnd: 0.6,
        particles: {
            kind: 'rain',
            count: 130,
            length: [4, 10],
            fall: 1.8,
            slant: -0.3,
            flow: 2.4,
            color: 'rgba(176, 255, 96, 0.7)',
            splashes: 12,
            splashTime: 0.1,
            /** Green lightning. */
            lightning: { every: 5.9, alpha: 0.4, color: [190, 255, 140] },
        },
        tint: 'rgba(40, 70, 20, 0.3)',
        ambience: { f: 3400, q: 0.35, v: 0.11 },
    },
    /** The grid vortex's clear night: sparks drifting up from the grid. */
    clearNight: {
        name: 'CLEAR NIGHT',
        icon: 'sparks',
        grip: 1,
        fogStart: 0.25,
        fogEnd: 1,
        particles: {
            kind: 'bubbles',
            count: 28,
            fall: -0.12,
            slant: 0.02,
            flow: 1.8,
            sway: 0.02,
            swayRate: 1.4,
            streak: 2,
            color: 'rgba(255, 120, 230, 0.85)',
            far: 'rgba(120, 220, 255, 0.6)',
        },
        tint: null,
        ambience: { f: 2400, q: 0.5, v: 0.03 },
    },
    /** Streams of glowing code falling through the night. */
    dataRain: {
        name: 'DATA RAIN',
        icon: 'data',
        grip: 0.85,
        fogStart: 0.12,
        fogEnd: 0.8,
        particles: {
            kind: 'rain',
            count: 90,
            length: [6, 14],
            fall: 1.4,
            slant: 0,
            flow: 2,
            color: 'rgba(90, 255, 200, 0.7)',
            splashes: 8,
            splashTime: 0.08,
        },
        tint: 'rgba(10, 40, 40, 0.18)',
        ambience: { f: 3000, q: 0.4, v: 0.07 },
    },
    /** A power surge: magenta bolts, the air crackling, the grid flickering. */
    surge: {
        name: 'SURGE',
        icon: 'surge',
        grip: 0.8,
        fogStart: 0.08,
        fogEnd: 0.7,
        particles: {
            kind: 'rain',
            count: 70,
            length: [3, 7],
            fall: 2.2,
            slant: 0.5,
            flow: 2.6,
            color: 'rgba(255, 140, 255, 0.65)',
            splashes: 10,
            splashTime: 0.08,
            lightning: { every: 3.4, alpha: 0.45, color: [255, 120, 255] },
        },
        tint: 'rgba(50, 10, 60, 0.25)',
        ambience: { f: 1800, q: 0.6, v: 0.09 },
    },
};
