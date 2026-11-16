// Writes the career's rules for the server: node tools/export-economy.js
// Run it after changing prices, parts, mods, prizes, worlds or tracks (npm test reminds you).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ECONOMY_FILE, economyJson } from './economy.js';

writeFileSync(ECONOMY_FILE, economyJson());
console.log('wrote', fileURLToPath(ECONOMY_FILE));
