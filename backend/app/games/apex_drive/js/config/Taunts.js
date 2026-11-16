/**
 * What the player shouts in a speech bubble on going by a rival, the way
 * the 16-bit racers had their drivers talk: a jibe for a car overtaken, a
 * mock for one a lap down. `{name}` is the rival's name. Each list is
 * shuffled for the race and gone through in turn, so the same line does
 * not come twice in a row.
 *
 * Lines are drawn in one row: keep them within `maxLength` characters.
 */
export const TAUNTS = {
    overtake: [
        'EAT DUST!',
        'SEE YA, {name}!',
        'TOO SLOW!',
        'BYE BYE!',
        'MOVE IT!',
        'NICE TRY, {name}!',
        'CATCH ME IF YOU CAN!',
        'LATER, {name}!',
        'OUT OF MY WAY!',
    ],
    lapped: [
        'LAPPED, {name}!',
        'GET A BIKE!',
        'HELLO AGAIN, {name}!',
        'SUNDAY DRIVER!',
        'NEED A TOW?',
        'IS THAT REVERSE?',
        'MY GRANDMA IS FASTER!',
        'TAXI FOR {name}!',
    ],
    /** Seconds a bubble stays up, and the quiet after one before the next. */
    show: 1.8,
    gap: 1,
    /** Longest line, in characters (with the longest name). */
    maxLength: 22,
};
