/**
 * Steem Games - static showcase of games built by other Steem dev teams.
 *
 * These games are NOT hosted on the platform: each card simply opens the
 * game's own website in a new tab. To add a game, append an entry below.
 *
 * Entry format:
 * {
 *     id: 'unique-id',                       // unique key (lowercase, no spaces)
 *     title: 'Game Title',
 *     description: 'Short description shown on the card.',
 *     author: '@steem-account',              // developer / team
 *     category: 'arcade',
 *     tags: ['pvp', 'cards'],
 *     url: 'https://example.com',            // must be https
 *     thumbnail: 'https://example.com/thumb.png' // https URL or local path (e.g. ./images/steem-games/x.png)
 * }
 */
// Source: https://steemgames.do2earn.dev/ (snapshot 2026-11-23), our own cur8 games excluded.
// Ordered by the directory ranking. Logos saved locally in ./images/steem-games/.
const STEEM_GAMES = [
    {
        id: "steemhop",
        title: "Steem Hop",
        description: "Steem Hop is an exciting endless-runner game powered by the Steem Blockchain and designed for the Steem community.",
        author: "@steemhop.org",
        category: "action",
        tags: ["arcade", "casual"],
        url: "https://steemhop.org/",
        thumbnail: "./images/steem-games/steemhop.webp"
    },
    {
        id: "hariraid",
        title: "Hari Raid",
        description: "HARI RAID is a free-to-play, blockchain-based card battle game built on the STEEM blockchain.",
        author: "@h4lab",
        category: "card",
        tags: ["rpg", "strategy"],
        url: "https://hari-raid.h4lab.com/",
        thumbnail: "./images/steem-games/hariraid.webp"
    },
    {
        id: "steemretrogames",
        title: "Steem Retrogames",
        description: "Steem-RetroGames is a blockchain-based gaming platform built on the STEEM ecosystem, bringing classic arcade-style games and retro gaming experiences to the Steem community.",
        author: "@steem-retrogames",
        category: "action",
        tags: ["arcade", "casual", "puzzle"],
        url: "https://steem-retrogames.com/",
        thumbnail: "./images/steem-games/steemretrogames.webp"
    },
    {
        id: "steemludo",
        title: "Steem Ludo",
        description: "Steem Ludo is a classic multiplayer board game where players compete to move their tokens around the board and reach the finish line before their opponents.",
        author: "@steemx.org",
        category: "board",
        tags: ["casual", "strategy"],
        url: "https://steemx.org/ludo/game",
        thumbnail: "./images/steem-games/steemludo.webp"
    },
    {
        id: "steemheights",
        title: "Steem Heights",
        description: "Steem Heights is an arcade-style platform game where players navigate through challenging levels, overcome obstacles, and test their timing and reflexes.",
        author: "@steempro.com",
        category: "arcade",
        tags: ["casual", "platformer"],
        url: "https://www.steempro.com/games/steem-heights",
        thumbnail: "./images/steem-games/steemheights.webp"
    },
    {
        id: "steemarchers",
        title: "Steem Archers",
        description: "Steem Archers is an exciting archery game where players test their aiming skills, precision, and timing.",
        author: "@steempro",
        category: "action",
        tags: ["arcade", "sports"],
        url: "https://archers.steempro.com/",
        thumbnail: "./images/steem-games/steemarchers.webp"
    },
    {
        id: "steembingo",
        title: "Steem Bingo",
        description: "Steem Bingo on Steem is an online bingo game built around the Steem blockchain.",
        author: "@blaze.apps",
        category: "board",
        tags: ["casual", "social"],
        url: "https://bingo.worldofxpilar.com/",
        thumbnail: "./images/steem-games/steembingo.webp"
    },
    {
        id: "memory-game",
        title: "Memory Game",
        description: "Steem Memory Game is a casual puzzle game that challenges players to test and improve their memory through matching pairs of cards.",
        author: "@kafio.wit",
        category: "casual",
        tags: ["educational", "puzzle"],
        url: "https://memory-game.steemhub.tech/",
        thumbnail: "./images/steem-games/memory-game.webp"
    },
    {
        id: "steem4snake",
        title: "Steem4Snake",
        description: "Steem4Snake is a competitive multiplayer snake game built on the Steem blockchain.",
        author: "@friends.witness",
        category: "arcade",
        tags: ["casual", "survival"],
        url: "https://steemone.com/games/",
        thumbnail: "./images/steem-games/steem4snake.webp"
    },
    {
        id: "pixel-craft",
        title: "Pixel Craft",
        description: "Pixel Craft is a collaborative pixel art game built on the Steem blockchain.",
        author: "@kafio.wit",
        category: "art",
        tags: ["casual", "social"],
        url: "https://pixelcraft-beta.steemhub.tech/",
        thumbnail: "./images/steem-games/pixel-craft.webp"
    },
    {
        id: "steem4poker",
        title: "Steem4poker",
        description: "Steem4Poker is a multiplayer Texas Hold'em poker game built on the Steem blockchain.",
        author: "@xpilar",
        category: "card",
        tags: ["social", "strategy"],
        url: "https://steem4poker.com/",
        thumbnail: "./images/steem-games/steem4poker.webp"
    },
    {
        id: "steem8ball",
        title: "Steem 8 Ball",
        description: "Steem 8Ball is an online billiards game where players can enjoy the classic 8-ball pool experience.",
        author: "@steemx.org",
        category: "casual",
        tags: ["pvp", "sports"],
        url: "https://www.steemx.org/8ballpool",
        thumbnail: "./images/steem-games/steem8ball.webp"
    },
    {
        id: "steem-maze",
        title: "SteemMaze",
        description: "Steem Maze is an exciting 3D adventure game set in an enchanted garden maze.",
        author: "@dhaka.witness",
        category: "action",
        tags: ["adventure", "puzzle"],
        url: "https://maze.steemblocks.com/",
        thumbnail: "./images/steem-games/steem-maze.webp"
    },
    {
        id: "steemflags",
        title: "Steem Flags",
        description: "Steem Flags is a quiz game where you guess the country from its flag.",
        author: "@do2earn",
        category: "quiz",
        tags: ["educational", "trivia"],
        // Site root: it redirects to a "temporarily disabled" page while the game is down
        url: "https://steemflags.do2earn.dev/",
        thumbnail: "./images/steem-games/steemflags.webp"
    }
];

const SAFE_URL_PREFIX = 'https://';

/**
 * Check that an entry has the minimum data needed to render a safe card.
 * @param {Object} game
 * @returns {boolean}
 */
export function isValidSteemGame(game) {
    return Boolean(
        game?.id &&
        game.title &&
        typeof game.url === 'string' &&
        game.url.startsWith(SAFE_URL_PREFIX)
    );
}

/**
 * Get the list of Steem games to display, skipping malformed entries.
 * @param {Object[]} [source=STEEM_GAMES]
 * @returns {Object[]}
 */
export function getSteemGames(source = STEEM_GAMES) {
    return source.filter(isValidSteemGame);
}
