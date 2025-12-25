/**
 * Empire OS - UI Module
 * DOM helpers, notifications, and modal management
 */

/**
 * Query selector shorthand
 * @param {string} selector 
 * @param {Element} parent 
 * @returns {Element|null}
 */
function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Query selector all shorthand
 * @param {string} selector 
 * @param {Element} parent 
 * @returns {NodeList}
 */
function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Create element with attributes and children
 * @param {string} tag 
 * @param {Object} attrs 
 * @param  {...(Element|string)} children 
 * @returns {Element}
 */
function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'dataset') {
            Object.assign(el.dataset, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }

    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Element) {
            el.appendChild(child);
        }
    }

    return el;
}

/**
 * Show element
 * @param {Element|string} el 
 */
function show(el) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.hidden = false;
        element.removeAttribute('hidden');
    }
}

/**
 * Hide element
 * @param {Element|string} el 
 */
function hide(el) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.hidden = true;
        element.setAttribute('hidden', '');
    }
}

/**
 * Toggle element visibility
 * @param {Element|string} el 
 * @param {boolean} visible 
 */
function toggle(el, visible) {
    if (visible) {
        show(el);
    } else {
        hide(el);
    }
}

/**
 * Add class to element
 * @param {Element|string} el 
 * @param {string} className 
 */
function addClass(el, className) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.classList.add(className);
    }
}

/**
 * Remove class from element
 * @param {Element|string} el 
 * @param {string} className 
 */
function removeClass(el, className) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.classList.remove(className);
    }
}

/**
 * Toggle class on element
 * @param {Element|string} el 
 * @param {string} className 
 * @param {boolean} force 
 */
function toggleClass(el, className, force) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.classList.toggle(className, force);
    }
}

/**
 * Open modal
 * @param {string} modalId 
 */
function openModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        show(modal);
        modal.setAttribute('aria-hidden', 'false');

        const firstFocusable = $('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
        if (firstFocusable) {
            firstFocusable.focus();
        }

        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close modal
 * @param {string} modalId 
 */
function closeModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        hide(modal);
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

/**
 * Close all modals
 */
function closeAllModals() {
    $$('.modal').forEach(modal => {
        hide(modal);
        modal.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
}

/**
 * Toast notification types
 */
const TOAST_TYPES = {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    INFO: 'info'
};

/**
 * Show toast notification
 * @param {string} message 
 * @param {string} type 
 * @param {number} duration 
 */
function showToast(message, type = TOAST_TYPES.INFO, duration = 4000) {
    const container = $('#toast-container');
    if (!container) return;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = createElement('div', { className: `toast toast-${type}` },
        createElement('span', { className: 'toast-icon' }),
        createElement('span', { className: 'toast-message' }, message),
        createElement('button', {
            className: 'icon-btn toast-close',
            'aria-label': 'Close',
            onClick: () => toast.remove()
        })
    );

    toast.querySelector('.toast-icon').innerHTML = icons[type] || icons.info;
    toast.querySelector('.toast-close').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    container.appendChild(toast);

    const announce = $('#notifications');
    if (announce) {
        announce.textContent = message;
    }

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.2s ease reverse';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

/**
 * Update sync status display
 * @param {string} status - 'synced', 'syncing', 'pending', 'failed', 'offline'
 * @param {string} text 
 */
function updateSyncStatus(status, text) {
    const statusEl = $('#sync-status');
    if (!statusEl) return;

    const iconEl = statusEl.querySelector('.sync-icon');
    const textEl = statusEl.querySelector('.sync-text');

    iconEl.className = `sync-icon ${status}`;

    const icons = {
        synced: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        syncing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
        pending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        failed: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        offline: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
    };

    iconEl.innerHTML = icons[status] || icons.synced;
    textEl.textContent = text || status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Update streak badge
 * @param {number} count 
 */
function updateStreakBadge(count) {
    const countEl = $('#streak-count');
    if (countEl) {
        countEl.textContent = count.toString();
    }
}

/**
 * Format relative time
 * @param {number} timestamp 
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return new Date(timestamp).toLocaleDateString();
}

/**
 * Debounce function
 * @param {Function} fn 
 * @param {number} delay 
 * @returns {Function}
 */
function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle function
 * @param {Function} fn 
 * @param {number} limit 
 * @returns {Function}
 */
function throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export {
    $,
    $$,
    createElement,
    show,
    hide,
    toggle,
    addClass,
    removeClass,
    toggleClass,
    openModal,
    closeModal,
    closeAllModals,
    TOAST_TYPES,
    showToast,
    updateSyncStatus,
    updateStreakBadge,
    formatRelativeTime,
    debounce,
    throttle
};
