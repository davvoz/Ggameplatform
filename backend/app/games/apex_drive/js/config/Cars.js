/**
 * The cars' pixel art, seen from behind. Only the left half is drawn here;
 * render/CarArt.js mirrors it. One letter per pixel, '.' is transparent.
 * In the wheels the columns holding a W are the treads, redrawn by the art
 * itself so they seem to roll; t and T are the tail lights, brighter on the
 * brake. `turns` are the turning poses, drawn by hand (render/art/poses.js).
 */
export const CARS = {
    comet: {
        left: [
            '..kkkkkkkkkkkkkkkkkkkk',
            '..kyyyyyyyyyyyyyyyyyyy',
            '..kkkkkkkkkkkkkkkkkkkk',
            '........kk.....kkkkkkk',
            '........kk...kkGGGGGGG',
            '........kk..kgGGgggggg',
            '........kkkkgggggggggg',
            'kkkkkk.kkRRRkkkkkkkkkk',
            'kwWwwkkRRRRRRRRRRRRRRR',
            'kwwwwkrrrrrrrrrrrrrrrr',
            'kwWwwkrTTTtttrrrrrrrrr',
            'kwwwwkrtttttdrrrrrrrrr',
            'kwWwwkrrrrrrrrrrkkkkkk',
            'kwwwwkdddddddddkssssss',
            'kwWwwkkkkkkkkkkksseees',
            'kwwwwk....kkkkkkkkkkkk',
            'kkkkkk................',
        ],
        colors: {
            k: '#140c1c',
            y: '#ffd34a',
            G: '#9fc4ff',
            g: '#2c3e78',
            R: '#ff6b5e',
            r: '#d42a3c',
            d: '#7a1630',
            w: '#22202c',
            W: '#4a4658',
            s: '#9aa0b4',
            e: '#3a3848',
            t: '#9a1424',
            T: '#ff5a48',
        },
        /** Tail lights on the brake. */
        brakeColors: { t: '#ff2a2a', T: '#fff0b0' },
        /** Where the exhausts end, from the sprite's left edge (mirrored on the right). */
        exhaust: { x: 19, y: 15 },
        /**
         * Turning right, drawn whole, the slightest first (the left turns are
         * their mirrors): the car seen more and more three-quarters, its rear
         * narrower (the far side is further away), the right flank, side glass
         * and both right wheels with their rims showing. As tall as `left`; as
         * wide as the whole car plus the same room on each side, which the
         * straight pose gets too. `exhaust`: the pipes' x in that pose.
         */
        turns: [
            {
                rows: [
                    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk........',
                    '....kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyykk........',
                    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk........',
                    '.........kk.....kkkkkkkkkkkkk.....kk.....k........',
                    '.........kk...kkGGGGGGGGGGGGGkkGG.kk..............',
                    '.........kk..kgGGgggggggggggGGgkggkk..............',
                    '.........kkkkgggggggggggggggggggkkkkgkkkkkkk......',
                    '..kkkkkk.kkRRRkkkkkkkkkkkkkkkkkkRRRkk.kkkkkkkkkk..',
                    '..kwWwwkkRRRRRRRRRRRRRRRRRRRRRRRRRRRRkkwWwekRRRRk.',
                    '..kwwwwkrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkwWwekrrrrk.',
                    '..kwWwwkrTTTtttrrrrrrrrrrrrrrrrtttTTTrkwWwskrrrrk.',
                    '..kwwwwkrtttttdrrrrrrrrrrrrrrrrdtttttrkwWwskdkkkk.',
                    '..kwWwwkrrrrrrrrrkkkkkkkkkkkkrrrrrrrrrkwWwskdkWsk.',
                    '..kwwwwkddddddddksssssssssssskddddddddkwWwskkkWek.',
                    '..kwWwwkkkkkkkkkksseeesseeesskkkkkkkkkkwWwek.kkkk.',
                    '..kwwwwk....kkkkkkkkkkkkkkkkkkkkkk....kwWwek......',
                    '..kkkkkk..............................kkkkkk......',
                ],
                exhaust: [20, 25],
            },
            {
                rows: [
                    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............',
                    '..kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyykk............',
                    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............',
                    '.......kk....kkkkkkkkkkkkkkkkkkkkkkkkk............',
                    '.......kk..kkGGGGGGGGGGGGkkGGkkGGGGGk.............',
                    '.......kk.kgGGggggggggggGGgkgkkggggggk............',
                    '.......kkkggggggggggggggggggkkkgggggggkkkkkkkkkk..',
                    'kkkkkk.kkRRkkkkkkkkkkkkkkkkkRRkkkkkkkkRRRRRRRRRRk.',
                    'kwWwwkkRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRrrrrrrrrk',
                    'kwwwwkrrrrrrrrrrrrrrrrrrrrrrrrrrRkkkkkkkkrrrrrrrrk',
                    'kwWwwkrTTtttrrrrrrrrrrrrrrrtttTTRkwWwwwwkrkkkkkkrk',
                    'kwwwwkrttttdrrrrrrrrrrrrrrrdttttRkwWweswkdkWwwwkdk',
                    'kwWwwkrrrrrrrrkkkkkkkkkkkrrrrrrrRkwWwseskdkWwsekdk',
                    'kwwwwkdddddddkssssssssssskdddddddkwWwseskkkWweskk.',
                    'kwWwwkkkkkkkkksseeeseeesskkkkkkkkkwWweswk.kkkkkk..',
                    'kwwwwk...kkkkkkkkkkkkkkkkkkkkk...kwWwwwwk.........',
                    'kkkkkk...........................kkkkkkkk.........',
                ],
                exhaust: [17, 21],
            },
        ],
    },
};

export const PLAYER_CAR = 'comet';
