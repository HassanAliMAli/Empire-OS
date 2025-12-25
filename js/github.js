/**
 * Empire OS - GitHub Module
 * GitHub API wrapper for file operations
 */

const API_BASE = 'https://api.github.com';

let _pat = null;
let _repo = null;

/**
 * Initialize GitHub module with credentials
 * @param {string} pat - Personal Access Token
 * @param {string} repo - Repository (username/repo)
 */
function init(pat, repo) {
    _pat = pat;
    _repo = repo;
}

/**
 * Get current configuration
 * @returns {{pat: string, repo: string}}
 */
function getConfig() {
    return { pat: _pat, repo: _repo };
}

/**
 * Make authenticated request to GitHub API
 * @param {string} endpoint 
 * @param {Object} options 
 * @returns {Promise<Response>}
 */
async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const headers = {
        'Authorization': `Bearer ${_pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers
    };

    if (options.body && typeof options.body === 'object') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, { ...options, headers });
    return response;
}

/**
 * Retry request with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries 
 * @returns {Promise<*>}
 */
async function withRetry(fn, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (error.status === 401 || error.status === 403 || error.status === 404) {
                throw error;
            }

            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Validate PAT and get user info
 * @param {string} pat 
 * @returns {Promise<Object>}
 */
async function validateToken(pat) {
    const response = await fetch(`${API_BASE}/user`, {
        headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        const error = new Error('Invalid token');
        error.status = response.status;
        throw error;
    }

    const scopes = response.headers.get('x-oauth-scopes') || '';
    if (!scopes.includes('repo')) {
        throw new Error('Token requires "repo" scope');
    }

    return response.json();
}

/**
 * Check if repository exists and is accessible
 * @param {string} repo - username/repo
 * @param {string} pat 
 * @returns {Promise<Object>}
 */
async function validateRepo(repo, pat) {
    const response = await fetch(`${API_BASE}/repos/${repo}`, {
        headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        const error = new Error('Repository not found or inaccessible');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

/**
 * Get file content from repository
 * @param {string} path - File path in repo
 * @returns {Promise<{content: string, sha: string}|null>}
 */
async function getFile(path) {
    const response = await request(`/repos/${_repo}/contents/${path}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const error = new Error('Failed to get file');
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    const content = atob(data.content.replace(/\n/g, ''));

    return {
        content: decodeURIComponent(escape(content)),
        sha: data.sha
    };
}

/**
 * Create or update file in repository
 * @param {string} path - File path
 * @param {string} content - File content
 * @param {string} message - Commit message
 * @param {string} sha - Existing file SHA (for updates)
 * @returns {Promise<{sha: string, commit: Object}>}
 */
async function putFile(path, content, message, sha = null) {
    const body = {
        message,
        content: btoa(unescape(encodeURIComponent(content)))
    };

    if (sha) {
        body.sha = sha;
    }

    const response = await request(`/repos/${_repo}/contents/${path}`, {
        method: 'PUT',
        body
    });

    if (!response.ok) {
        const error = new Error('Failed to save file');
        error.status = response.status;

        if (response.status === 409) {
            error.message = 'Conflict: file was modified externally';
        }

        throw error;
    }

    const data = await response.json();
    return {
        sha: data.content.sha,
        commit: data.commit
    };
}

/**
 * Delete file from repository
 * @param {string} path - File path
 * @param {string} sha - File SHA
 * @param {string} message - Commit message
 * @returns {Promise<Object>}
 */
async function deleteFile(path, sha, message) {
    const response = await request(`/repos/${_repo}/contents/${path}`, {
        method: 'DELETE',
        body: { message, sha }
    });

    if (!response.ok) {
        const error = new Error('Failed to delete file');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

/**
 * List files in directory
 * @param {string} path - Directory path
 * @returns {Promise<Array<{name: string, path: string, sha: string, type: string}>>}
 */
async function listFiles(path) {
    const response = await request(`/repos/${_repo}/contents/${path}`);

    if (response.status === 404) {
        return [];
    }

    if (!response.ok) {
        const error = new Error('Failed to list files');
        error.status = response.status;
        throw error;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        return [];
    }

    return data.map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        type: item.type
    }));
}

/**
 * Get journal entry from GitHub
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{content: string, sha: string}|null>}
 */
async function getEntry(date) {
    return withRetry(() => getFile(`entries/${date}.md`));
}

/**
 * Save journal entry to GitHub
 * @param {string} date - YYYY-MM-DD
 * @param {string} markdown - Entry content
 * @param {string} sha - Existing SHA (for updates)
 * @returns {Promise<{sha: string}>}
 */
async function saveEntry(date, markdown, sha = null) {
    const message = sha
        ? `Update entry: ${date}`
        : `Add entry: ${date}`;

    return withRetry(() => putFile(`entries/${date}.md`, markdown, message, sha));
}

/**
 * Delete journal entry from GitHub
 * @param {string} date - YYYY-MM-DD
 * @param {string} sha - File SHA
 * @returns {Promise<Object>}
 */
async function deleteEntry(date, sha) {
    return withRetry(() => deleteFile(`entries/${date}.md`, sha, `Delete entry: ${date}`));
}

/**
 * List all journal entries
 * @returns {Promise<string[]>} Array of dates
 */
async function listEntries() {
    const files = await withRetry(() => listFiles('entries'));

    return files
        .filter(f => f.type === 'file' && f.name.endsWith('.md') && f.name !== '.gitkeep')
        .map(f => f.name.replace('.md', ''))
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort()
        .reverse();
}

/**
 * Check if online
 * @returns {boolean}
 */
function isOnline() {
    return navigator.onLine;
}

export {
    init,
    getConfig,
    validateToken,
    validateRepo,
    getFile,
    putFile,
    deleteFile,
    listFiles,
    getEntry,
    saveEntry,
    deleteEntry,
    listEntries,
    isOnline,
    withRetry
};
