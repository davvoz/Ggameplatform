/**
 * Posting Key Vault
 * Keeps the posting key of a player who signed in with it, so what they
 * publish later (a ping) is signed without asking for it again, as KIJAM does.
 *
 * The key is encrypted with AES-GCM (256-bit) by a device key: a random,
 * non-extractable CryptoKey kept in IndexedDB next to the sealed key, bound
 * to its account (the AES-GCM additional data). It keeps the key from being
 * read at a glance in the browser's storage, nothing more: a script running on
 * this origin can still use it. Cleared on logout and on a Keychain login.
 */

const DB_NAME = 'cur8-vault';
const STORE = 'secrets';
const DEVICE_KEY = 'device';
const POSTING_KEY = 'posting';
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore(mode, action) {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            const request = action(transaction.objectStore(STORE));
            transaction.oncomplete = () => resolve(request?.result);
            transaction.onerror = () => reject(transaction.error);
        });
    } finally {
        db.close();
    }
}

const read = (name) => withStore('readonly', (store) => store.get(name));
const write = (name, value) => withStore('readwrite', (store) => store.put(value, name));

async function deviceKey() {
    const existing = await read(DEVICE_KEY);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await write(DEVICE_KEY, key);
    return key;
}

const additionalData = (account) => encoder.encode(`posting:${account}`);

class PostingKeyVault {
    /**
     * Keep the posting key of the signed-in account
     * @param {string} account - Steem account
     * @param {string} wif - Posting key
     */
    async save(account, wif) {
        try {
            const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
            const data = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv, additionalData: additionalData(account) },
                await deviceKey(),
                encoder.encode(wif)
            );
            await write(POSTING_KEY, { account, iv, data });
        } catch (error) {
            console.warn('Posting key could not be kept in this browser:', error);
        }
    }

    /**
     * The posting key kept for an account, if any
     * @param {string} account - Steem account
     * @returns {Promise<string|null>}
     */
    async load(account) {
        try {
            const sealed = await read(POSTING_KEY);
            if (!sealed || sealed.account !== account) return null;
            const key = await read(DEVICE_KEY);
            if (!key) return null;
            const plain = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: sealed.iv, additionalData: additionalData(account) },
                key,
                sealed.data
            );
            return decoder.decode(plain);
        } catch {
            return null;
        }
    }

    /** Forget the kept key (logout, another login method, a key the chain refused) */
    async clear() {
        try {
            await withStore('readwrite', (store) => store.delete(POSTING_KEY));
        } catch (error) {
            console.warn('Posting key could not be cleared:', error);
        }
    }
}

const postingKeyVault = new PostingKeyVault();
export default postingKeyVault;
