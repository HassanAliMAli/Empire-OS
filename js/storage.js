/**
 * Empire OS - Storage Module
 * LocalStorage cache layer and offline queue management
 */

const KEYS = {
    PAT: 'empire_pat',
    REPO: 'empire_repo',
    ENTRIES: 'empire_entries',
    PENDING: 'empire_pending',
    INDEX: 'empire_index',
    SETTINGS: 'empire_settings'
};

const DEFAULT_SETTINGS = {
    theme: 'dark',
    autosync: true
};

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key 
 * @param {*} defaultValue 
 * @returns {*}
 */
function getItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch {
        return defaultValue;
    }
}

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key 
 * @param {*} value 
 * @returns {boolean}
 */
function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/**
 * Remove item from localStorage
 * @param {string} key 
 */
function removeItem(key) {
    localStorage.removeItem(key);
}

/**
 * Get stored PAT
 * @returns {string|null}
 */
function getPAT() {
    return localStorage.getItem(KEYS.PAT);
}

/**
 * Set PAT
 * @param {string} pat 
 */
function setPAT(pat) {
    localStorage.setItem(KEYS.PAT, pat);
}

/**
 * Get stored repository
 * @returns {string|null}
 */
function getRepo() {
    return localStorage.getItem(KEYS.REPO);
}

/**
 * Set repository
 * @param {string} repo - Format: username/repo
 */
function setRepo(repo) {
    localStorage.setItem(KEYS.REPO, repo);
}

/**
 * Check if app is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!(getPAT() && getRepo());
}

/**
 * Clear configuration
 */
function clearConfig() {
    removeItem(KEYS.PAT);
    removeItem(KEYS.REPO);
}

/**
 * Get all cached entries
 * @returns {Object} Map of date -> entry data
 */
function getEntries() {
    return getItem(KEYS.ENTRIES, {});
}

/**
 * Get single cached entry
 * @param {string} date - YYYY-MM-DD
 * @returns {Object|null}
 */
function getEntry(date) {
    const entries = getEntries();
    return entries[date] || null;
}

/**
 * Save entry to cache
 * @param {string} date - YYYY-MM-DD
 * @param {Object} entryData - { markdown, sha, synced }
 */
function saveEntry(date, entryData) {
    const entries = getEntries();
    entries[date] = {
        ...entryData,
        updatedAt: Date.now()
    };
    setItem(KEYS.ENTRIES, entries);
    updateIndex(date);
}

/**
 * Delete entry from cache
 * @param {string} date 
 */
function deleteEntry(date) {
    const entries = getEntries();
    delete entries[date];
    setItem(KEYS.ENTRIES, entries);

    const index = getIndex();
    const newIndex = index.filter(d => d !== date);
    setItem(KEYS.INDEX, newIndex);
}

/**
 * Mark entry as synced
 * @param {string} date 
 * @param {string} sha - Commit SHA from GitHub
 */
function markSynced(date, sha) {
    const entries = getEntries();
    if (entries[date]) {
        entries[date].synced = true;
        entries[date].sha = sha;
        entries[date].syncedAt = Date.now();
        setItem(KEYS.ENTRIES, entries);
    }
    removePending(date);
}

/**
 * Mark entry as pending sync
 * @param {string} date 
 */
function markPending(date) {
    const entries = getEntries();
    if (entries[date]) {
        entries[date].synced = false;
        setItem(KEYS.ENTRIES, entries);
    }
    addPending(date);
}

/**
 * Get pending sync queue
 * @returns {string[]}
 */
function getPending() {
    return getItem(KEYS.PENDING, []);
}

/**
 * Add date to pending queue
 * @param {string} date 
 */
function addPending(date) {
    const pending = getPending();
    if (!pending.includes(date)) {
        pending.push(date);
        setItem(KEYS.PENDING, pending);
    }
}

/**
 * Remove date from pending queue
 * @param {string} date 
 */
function removePending(date) {
    const pending = getPending();
    const newPending = pending.filter(d => d !== date);
    setItem(KEYS.PENDING, newPending);
}

/**
 * Clear pending queue
 */
function clearPending() {
    setItem(KEYS.PENDING, []);
}

/**
 * Get entry index (list of dates)
 * @returns {string[]}
 */
function getIndex() {
    return getItem(KEYS.INDEX, []);
}

/**
 * Update index with new date
 * @param {string} date 
 */
function updateIndex(date) {
    const index = getIndex();
    if (!index.includes(date)) {
        index.push(date);
        index.sort().reverse();
        setItem(KEYS.INDEX, index);
    }
}

/**
 * Set full index (from GitHub)
 * @param {string[]} dates 
 */
function setIndex(dates) {
    const sorted = [...dates].sort().reverse();
    setItem(KEYS.INDEX, sorted);
}

/**
 * Get settings
 * @returns {Object}
 */
function getSettings() {
    return getItem(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Update settings
 * @param {Object} updates 
 */
function updateSettings(updates) {
    const settings = getSettings();
    setItem(KEYS.SETTINGS, { ...settings, ...updates });
}

/**
 * Get storage usage info
 * @returns {{used: number, available: boolean}}
 */
function getStorageInfo() {
    let used = 0;
    for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            used += localStorage[key].length * 2;
        }
    }

    const testKey = '__storage_test__';
    let available = true;
    try {
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
    } catch {
        available = false;
    }

    return { used, available };
}

/**
 * Clear old cached entries (keep last N)
 * @param {number} keep - Number of entries to keep
 */
function pruneCache(keep = 100) {
    const entries = getEntries();
    const dates = Object.keys(entries).sort().reverse();

    if (dates.length <= keep) return;

    const toRemove = dates.slice(keep);
    for (const date of toRemove) {
        if (entries[date].synced) {
            delete entries[date];
        }
    }

    setItem(KEYS.ENTRIES, entries);
}

/**
 * Export all data as JSON
 * @returns {Object}
 */
function exportData() {
    return {
        entries: getEntries(),
        index: getIndex(),
        settings: getSettings(),
        exportedAt: new Date().toISOString()
    };
}

/**
 * Clear all stored data
 */
function clearAll() {
    for (const key of Object.values(KEYS)) {
        removeItem(key);
    }
}

export {
    KEYS,
    getPAT,
    setPAT,
    getRepo,
    setRepo,
    isConfigured,
    clearConfig,
    getEntries,
    getEntry,
    saveEntry,
    deleteEntry,
    markSynced,
    markPending,
    getPending,
    addPending,
    removePending,
    clearPending,
    getIndex,
    updateIndex,
    setIndex,
    getSettings,
    updateSettings,
    getStorageInfo,
    pruneCache,
    exportData,
    clearAll
};
