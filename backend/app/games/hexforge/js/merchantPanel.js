import { costChips } from './forgePanel.js';
import { icon, withIcon } from './icons.js';
import { BONUS_INFO, ITEM_INFO, MATERIAL_INFO } from './labels.js';
import { itemPicture, thumbImg } from './thumbs.js';

/** The merchant's four offers of the day, in the Rewards sheet. */

/** What an offer gives, in words: "140 Chips", "Hourglass ×2", "Storm Staff". */
export function offerGives(gives) {
    if (gives.item) return ITEM_INFO[gives.item].name;
    const [[key, n]] = Object.entries(gives.materials ?? gives.bonuses);
    if (gives.materials) return `${n} ${MATERIAL_INFO[key].name}`;
    return `${BONUS_INFO[key].name}${n > 1 ? ` ×${n}` : ''}`;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function picture(gives) {
    if (gives.item) return thumbImg(itemPicture(gives.item, 44), '', '');
    const box = el('span', 'offer-icon');
    if (gives.bonuses) {
        const key = Object.keys(gives.bonuses)[0];
        box.style.setProperty('--accent', BONUS_INFO[key].color);
        box.append(icon(BONUS_INFO[key].icon));
    } else {
        const key = Object.keys(gives.materials)[0];
        box.style.setProperty('--accent', MATERIAL_INFO[key].color ?? '#ffb347');
        box.append(icon(MATERIAL_INFO[key].icon ?? 'gem'));
    }
    return box;
}

export function renderMerchant(container, merchant, materials, onBuy) {
    container.replaceChildren();
    for (const offer of merchant.offers) {
        const row = el('div', `offer${offer.bought ? ' sold' : ''}`);
        const text = el('span', 'offer-text');
        const kind = offer.gives.item ? 'Hero item, ready now' : offer.gives.bonuses ? 'Bonus' : 'Swap';
        text.append(el('b', '', offerGives(offer.gives)), el('small', '', kind));
        const side = el('span', 'offer-side');
        side.append(costChips(offer.cost, materials));
        const short = Object.entries(offer.cost).some(([m, n]) => (materials[m] ?? 0) < n);
        const button = withIcon(el('button', 'button primary small'), offer.bought ? 'check' : 'gift', offer.bought ? 'Sold' : 'Buy');
        button.type = 'button';
        button.disabled = offer.bought || short;
        button.addEventListener('click', () => onBuy(offer.id));
        side.append(button);
        row.append(picture(offer.gives), text, side);
        container.append(row);
    }
}
