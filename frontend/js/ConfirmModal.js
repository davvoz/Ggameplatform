/**
 * ConfirmModal - Reusable confirmation dialog for the platform.
 *
 * Follows Single Responsibility: only manages confirm/cancel user decisions.
 * Open/Closed: customisable via options without modifying the class.
 *
 * Usage:
 *   const confirmed = await ConfirmModal.show({
 *       title: 'Remove Connection',
 *       message: 'The conversation will be deleted.',
 *       confirmText: 'Remove',
 *       cancelText: 'Cancel',
 *       variant: 'danger'   // 'danger' | 'warning' | 'default'
 *   });
 */

const VARIANT_ICONS = Object.freeze({
    danger: '⚠️',
    warning: '⚡',
    default: 'ℹ️',
});

const VARIANT_CLASSES = Object.freeze({
    danger: 'confirm-modal__btn--danger',
    warning: 'confirm-modal__btn--warning',
    default: 'confirm-modal__btn--primary',
});

class ConfirmModal {

    /** @returns {Promise<boolean>} resolves true when confirmed, false otherwise */
    static show(options = {}) {
        const instance = new ConfirmModal(options);
        return instance._open();
    }

    constructor(options) {
        this._title = options.title ?? 'Confirm';
        this._message = options.message ?? 'Are you sure?';
        this._confirmText = options.confirmText ?? 'Confirm';
        this._cancelText = options.cancelText ?? 'Cancel';
        this._variant = options.variant ?? 'default';
        this._resolve = null;
        this._overlay = null;
        this._handleKeyDown = this._onKeyDown.bind(this);
    }

    /* ── Lifecycle ─────────────────────────────────────── */

    _open() {
        return new Promise((resolve) => {
            this._resolve = resolve;
            this._render();
            this._attachListeners();
            // Trigger entrance animation on next frame
            requestAnimationFrame(() => {
                this._overlay.classList.add('confirm-modal--visible');
            });
        });
    }

    _close(result) {
        if (!this._overlay) {
            return;
        }
        this._overlay.classList.remove('confirm-modal--visible');
        this._overlay.addEventListener('transitionend', () => {
            this._detachListeners();
            this._overlay.remove();
            this._overlay = null;
            this._resolve(result);
        }, { once: true });
    }

    /* ── DOM Construction ──────────────────────────────── */

    _render() {
        const icon = VARIANT_ICONS[this._variant] ?? VARIANT_ICONS.default;
        const btnClass = VARIANT_CLASSES[this._variant] ?? VARIANT_CLASSES.default;

        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirm-modal-title');

        this._backdrop = this._createBackdrop();
        overlay.appendChild(this._backdrop);

        const dialog = this._createDialog(icon, btnClass);
        overlay.appendChild(dialog);

        document.body.appendChild(overlay);
        this._overlay = overlay;

        this._cancelBtn.focus();
    }

    _createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'confirm-modal__backdrop';
        return backdrop;
    }

    _createDialog(icon, btnClass) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-modal__dialog';

        const iconEl = document.createElement('div');
        iconEl.className = 'confirm-modal__icon';
        iconEl.textContent = icon;
        dialog.appendChild(iconEl);

        const titleEl = document.createElement('h3');
        titleEl.className = 'confirm-modal__title';
        titleEl.id = 'confirm-modal-title';
        titleEl.textContent = this._title;
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.className = 'confirm-modal__message';
        messageEl.textContent = this._message;
        dialog.appendChild(messageEl);

        const actions = this._createActions(btnClass);
        dialog.appendChild(actions);

        return dialog;
    }

    _createActions(btnClass) {
        const actions = document.createElement('div');
        actions.className = 'confirm-modal__actions';

        this._cancelBtn = document.createElement('button');
        this._cancelBtn.type = 'button';
        this._cancelBtn.className = 'confirm-modal__btn confirm-modal__btn--cancel';
        this._cancelBtn.textContent = this._cancelText;
        actions.appendChild(this._cancelBtn);

        this._confirmBtn = document.createElement('button');
        this._confirmBtn.type = 'button';
        this._confirmBtn.className = `confirm-modal__btn ${btnClass}`;
        this._confirmBtn.textContent = this._confirmText;
        actions.appendChild(this._confirmBtn);

        return actions;
    }

    /* ── Event Handling ─────────────────────────────────── */

    _attachListeners() {
        this._backdrop.addEventListener('click', () => this._close(false));
        this._cancelBtn.addEventListener('click', () => this._close(false));
        this._confirmBtn.addEventListener('click', () => this._close(true));
        document.addEventListener('keydown', this._handleKeyDown);
    }

    _detachListeners() {
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    _onKeyDown(event) {
        if (event.key === 'Escape') {
            this._close(false);
        }
    }
}

export default ConfirmModal;
