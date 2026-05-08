const INVITE_BASE_URL = 'https://join.cur8.fun/';
const COPY_FEEDBACK_DURATION_MS = 2000;

class InviteFriendModal {

    /** @param {string} username */
    static show(username) {
        const instance = new InviteFriendModal(username);
        instance._open();
    }

    constructor(username) {
        this._username = username;
        this._overlay = null;
        this._backdrop = null;
        this._closeBtn = null;
        this._copyBtn = null;
        this._handleKeyDown = this._onKeyDown.bind(this);
    }

    /* ── Lifecycle ─────────────────────────────────────── */

    _open() {
        this._render();
        this._attachListeners();
        requestAnimationFrame(() => {
            this._overlay.classList.add('invite-modal--visible');
        });
    }

    _close() {
        if (!this._overlay) {
            return;
        }
        this._overlay.classList.remove('invite-modal--visible');
        this._overlay.addEventListener('transitionend', () => {
            this._detachListeners();
            this._overlay.remove();
            this._overlay = null;
        }, { once: true });
    }

    /* ── DOM Construction ──────────────────────────────── */

    _render() {
        const overlay = document.createElement('div');
        overlay.className = 'invite-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'invite-modal-title');

        this._backdrop = document.createElement('div');
        this._backdrop.className = 'invite-modal__backdrop';
        overlay.appendChild(this._backdrop);

        overlay.appendChild(this._createDialog());
        document.body.appendChild(overlay);
        this._overlay = overlay;
    }

    _createDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'invite-modal__dialog';
        dialog.appendChild(this._createBanner());
        dialog.appendChild(this._createBody());
        return dialog;
    }

    _createBanner() {
        const banner = document.createElement('div');
        banner.className = 'invite-modal__banner';



        this._closeBtn = document.createElement('button');
        this._closeBtn.type = 'button';
        this._closeBtn.className = 'invite-modal__close';
        this._closeBtn.setAttribute('aria-label', 'Close');
        this._closeBtn.textContent = '✕';
        banner.appendChild(this._closeBtn);

        return banner;
    }

    _createBody() {
        const body = document.createElement('div');
        body.className = 'invite-modal__body';
        body.appendChild(this._createFeatureList());
        body.appendChild(this._createLinkSection());
        return body;
    }

    _createFeatureList() {
        const features = [
            '🎮 Your friends get a free Steem account instantly',
            '🪙 Both you and your friend earn bonus Coins',
            '⚡ Build your referral network and grow together on Cur8',
        ];

        const list = document.createElement('ul');
        list.className = 'invite-modal__features';

        features.forEach(text => {
            const li = document.createElement('li');
            li.className = 'invite-modal__feature';
            li.textContent = text;
            list.appendChild(li);
        });

        return list;
    }

    _createLinkSection() {
        const section = document.createElement('div');
        section.className = 'invite-modal__link-section';

        const label = document.createElement('p');
        label.className = 'invite-modal__link-label';
        label.textContent = 'Your invite link';
        section.appendChild(label);

        section.appendChild(this._createLinkRow());
        return section;
    }

    _createLinkRow() {
        const link = this._buildInviteLink();

        const row = document.createElement('div');
        row.className = 'invite-modal__link-row';

        const linkBox = document.createElement('span');
        linkBox.className = 'invite-modal__link-box';
        linkBox.textContent = link;
        row.appendChild(linkBox);

        this._copyBtn = document.createElement('button');
        this._copyBtn.type = 'button';
        this._copyBtn.className = 'invite-modal__copy-btn';
        this._copyBtn.textContent = 'Copy';
        this._copyBtn.addEventListener('click', () => void this._handleCopyClick(link));
        row.appendChild(this._copyBtn);

        return row;
    }

    /* ── Actions ───────────────────────────────────────── */

    async _handleCopyClick(link) {
        await navigator.clipboard.writeText(link);
        this._setCopiedState();
        setTimeout(() => this._resetCopyState(), COPY_FEEDBACK_DURATION_MS);
    }

    _setCopiedState() {
        this._copyBtn.textContent = '✓ Copied!';
        this._copyBtn.classList.add('invite-modal__copy-btn--copied');
    }

    _resetCopyState() {
        this._copyBtn.textContent = 'Copy';
        this._copyBtn.classList.remove('invite-modal__copy-btn--copied');
    }

    _buildInviteLink() {
        return `${INVITE_BASE_URL}${this._username}`;
    }

    /* ── Event Handling ─────────────────────────────────── */

    _attachListeners() {
        this._backdrop.addEventListener('click', () => this._close());
        this._closeBtn.addEventListener('click', () => this._close());
        document.addEventListener('keydown', this._handleKeyDown);
    }

    _detachListeners() {
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    _onKeyDown(event) {
        if (event.key === 'Escape') {
            this._close();
        }
    }
}

export default InviteFriendModal;
