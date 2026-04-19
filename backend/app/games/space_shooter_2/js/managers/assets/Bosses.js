import { generateWorld1BossSprites } from './bosses/world1.js';
import { generateWorld2BossSprites } from './bosses/world2.js';
import { generateWorld3BossSprites } from './bosses/world3.js';
import { generateWorld4BossSprites } from './bosses/world4.js';

async function generateBossSprites(sprites) {
    await generateWorld1BossSprites(sprites);
    await generateWorld2BossSprites(sprites);
    await generateWorld3BossSprites(sprites);
    await generateWorld4BossSprites(sprites);
}

export {generateBossSprites};