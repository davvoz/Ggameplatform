import { generateWorld1MiniBossSprites } from './minibosses/world_mini1.js';
import { generateWorld2MiniBossSprites } from './minibosses/world_mini2.js';
import { generateWorld3MiniBossSprites } from './minibosses/world_mini3.js';
import { generateWorld4MiniBossSprites } from './minibosses/world_mini4.js';

async function generateMiniBossSprites(sprites) {
    await generateWorld1MiniBossSprites(sprites);
    await generateWorld2MiniBossSprites(sprites);
    await generateWorld3MiniBossSprites(sprites);
    await generateWorld4MiniBossSprites(sprites); 
}

export { generateMiniBossSprites };
