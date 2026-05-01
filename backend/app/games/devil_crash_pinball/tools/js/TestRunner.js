/**
 * Opens the game inside a modal iframe with `?source=postmessage` and ships
 * the editor's in-memory board to it.
 *
 * Wire protocol:
 *   iframe → parent: { type: 'devilCrashReady' }   → parent posts the payload
 *   parent → iframe: { type: 'devilCrashTestBoard', payload: { board, sections } }
 *
 * The runner cleans up its listener and DOM when the user closes the modal.
 */
export class TestRunner {
    _modal = null;
    _iframe = null;
    _listener = null;
    _payload = null;

    /**
     * @param {{ board: { sections: string[] }, sections: Record<string, object> }} payload
     */
    open(payload) {
        if (!payload?.board?.sections || !payload?.sections) {
            throw new Error('TestRunner.open: invalid payload');
        }
        this._payload = payload;
        this.#mountModal();
        this.#bindListener();
    }

    close() {
        if (this._listener) {
            window.removeEventListener('message', this._listener);
            this._listener = null;
        }
        this._modal?.remove();
        this._modal = null;
        this._iframe = null;
        this._payload = null;
    }

    #mountModal() {
        const modal = document.createElement('div');
        modal.className = 'editor-test-modal';

        const inner = document.createElement('div');
        inner.className = 'editor-test-inner';

        const bar = document.createElement('div');
        bar.className = 'editor-test-bar';
        const title = document.createElement('span');
        title.textContent = '🎮 Test Board (unsaved)';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close test';
        closeBtn.addEventListener('click', () => this.close());
        bar.append(title, closeBtn);

        const iframe = document.createElement('iframe');
        iframe.className = 'editor-test-iframe';
        iframe.title = 'Devil Crash Pinball — Test';
        iframe.src = `../index.html?source=postmessage&_=${Date.now()}`;

        inner.append(bar, iframe);
        modal.append(inner);
        document.body.appendChild(modal);

        this._modal = modal;
        this._iframe = iframe;
    }

    #bindListener() {
        const onMsg = (event) => {
            const data = event.data;
            if (data?.type !== 'devilCrashReady') return;
            if (!this._iframe || event.source !== this._iframe.contentWindow) return;
            try {
                this._iframe.contentWindow.postMessage({
                    type: 'devilCrashTestBoard',
                    payload: this._payload,
                }, event.origin || '*');
            } catch (err) {
                console.warn('[TestRunner] postMessage failed', err);
            }
        };
        this._listener = onMsg;
        window.addEventListener('message', onMsg);
    }
}
