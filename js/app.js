/**
 * Empire OS - Main Application
 * Orchestrator module that coordinates all components
 */

import * as Journal from './journal.js';
import * as Storage from './storage.js';
import * as GitHub from './github.js';
import * as Index from './index.js';
import * as Analytics from './analytics.js';
import * as UI from './ui.js';
import * as Export from './export.js';

let currentView = 'dashboard';
let currentDate = Journal.getTodayDate();
let isDirty = false;
let syncInProgress = false;

/**
 * Initialize the application
 */
async function init() {
    Index.init();

    if (!Storage.isConfigured()) {
        UI.openModal('setup-modal');
    } else {
        await initWithCredentials();
    }

    bindEvents();
    updateUI();

    setInterval(checkPendingSync, 30000);

    window.addEventListener('online', () => {
        UI.showToast('Back online', UI.TOAST_TYPES.SUCCESS);
        syncPendingEntries();
    });

    window.addEventListener('offline', () => {
        UI.showToast('You are offline', UI.TOAST_TYPES.WARNING);
        UI.updateSyncStatus('offline', 'Offline');
    });
}

/**
 * Initialize with stored credentials
 */
async function initWithCredentials() {
    const pat = Storage.getPAT();
    const repo = Storage.getRepo();

    GitHub.init(pat, repo);

    if (GitHub.isOnline()) {
        try {
            UI.updateSyncStatus('syncing', 'Syncing...');
            await refreshIndex();
            await syncPendingEntries();
            UI.updateSyncStatus('synced', 'Synced');
        } catch (error) {
            UI.updateSyncStatus('failed', 'Sync failed');
        }
    }

    UI.closeModal('setup-modal');
}

/**
 * Refresh entry index from GitHub
 */
async function refreshIndex() {
    try {
        const dates = await GitHub.listEntries();
        Index.setDates(dates);
    } catch {
    }
}

/**
 * Bind all event listeners
 */
function bindEvents() {
    UI.$$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    UI.$('#setup-form')?.addEventListener('submit', handleSetupSubmit);

    UI.$('#start-today-btn')?.addEventListener('click', () => {
        currentDate = Journal.getTodayDate();
        switchView('editor');
        loadEntry(currentDate);
    });

    UI.$('#view-all-btn')?.addEventListener('click', () => switchView('timeline'));

    UI.$('#save-btn')?.addEventListener('click', saveCurrentEntry);
    UI.$('#discard-btn')?.addEventListener('click', discardChanges);

    UI.$('#entry-date')?.addEventListener('change', (e) => {
        if (isDirty && !confirm('Discard unsaved changes?')) {
            e.target.value = currentDate;
            return;
        }
        currentDate = e.target.value;
        loadEntry(currentDate);
    });

    UI.$('#prev-day-btn')?.addEventListener('click', () => navigateDay(-1));
    UI.$('#next-day-btn')?.addEventListener('click', () => navigateDay(1));

    UI.$$('.score-field input[type="range"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const display = UI.$(`.score-value[data-for="${e.target.id}"]`);
            if (display) {
                display.textContent = e.target.value;
            }
            markDirty();
        });
    });

    UI.$$('#journal-form textarea, #journal-form input').forEach(input => {
        input.addEventListener('input', markDirty);
    });

    UI.$('#timeline-search')?.addEventListener('input', UI.debounce((e) => {
        Index.setSearchQuery(e.target.value);
        renderTimeline();
    }, 300));

    UI.$('#prev-page-btn')?.addEventListener('click', () => {
        if (Index.prevPage()) {
            renderTimeline();
        }
    });

    UI.$('#next-page-btn')?.addEventListener('click', () => {
        if (Index.nextPage()) {
            renderTimeline();
        }
    });

    UI.$$('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            UI.$$('.period-btn').forEach(b => UI.removeClass(b, 'active'));
            UI.addClass(e.target, 'active');
            renderAnalytics(parseInt(e.target.dataset.period, 10));
        });
    });

    UI.$('#settings-btn')?.addEventListener('click', () => {
        UI.openModal('shortcuts-modal');
    });

    UI.$$('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                UI.closeModal(modal.id);
            }
        });
    });

    UI.$$('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            const modal = backdrop.closest('.modal');
            if (modal && modal.id !== 'setup-modal') {
                UI.closeModal(modal.id);
            }
        });
    });

    UI.$$('.export-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const format = btn.dataset.format;
            try {
                if (format === 'zip') {
                    await Export.exportAsZIP();
                    UI.showToast('Entries exported as ZIP', UI.TOAST_TYPES.SUCCESS);
                } else if (format === 'json') {
                    await Export.exportAsJSON();
                    UI.showToast('Entries exported as JSON', UI.TOAST_TYPES.SUCCESS);
                }
                UI.closeModal('export-modal');
            } catch (error) {
                UI.showToast('Export failed', UI.TOAST_TYPES.ERROR);
            }
        });
    });

    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e 
 */
function handleKeyboard(e) {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (e.key === 'Escape') {
        UI.closeAllModals();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentView === 'editor') {
            saveCurrentEntry();
        }
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        UI.openModal('export-modal');
        return;
    }

    if (isInput) return;

    switch (e.key) {
        case '1':
            switchView('dashboard');
            break;
        case '2':
            switchView('editor');
            break;
        case '3':
            switchView('timeline');
            break;
        case '4':
            switchView('analytics');
            break;
        case 'n':
        case 'N':
            currentDate = Journal.getTodayDate();
            switchView('editor');
            loadEntry(currentDate);
            break;
        case 't':
        case 'T':
            currentDate = Journal.getTodayDate();
            if (currentView === 'editor') {
                loadEntry(currentDate);
            }
            break;
        case '/':
            e.preventDefault();
            const searchInput = UI.$('#timeline-search');
            if (searchInput) {
                switchView('timeline');
                searchInput.focus();
            }
            break;
        case '?':
            UI.openModal('shortcuts-modal');
            break;
        case 's':
        case 'S':
            if (currentView === 'editor') {
                saveCurrentEntry();
            }
            break;
        case 'ArrowLeft':
            if (currentView === 'editor') {
                navigateDay(-1);
            }
            break;
        case 'ArrowRight':
            if (currentView === 'editor') {
                navigateDay(1);
            }
            break;
    }
}

/**
 * Handle setup form submission
 * @param {Event} e 
 */
async function handleSetupSubmit(e) {
    e.preventDefault();

    const repoInput = UI.$('#setup-repo');
    const tokenInput = UI.$('#setup-token');

    const repo = repoInput.value.trim();
    const token = tokenInput.value.trim();

    if (!repo || !token) {
        UI.showToast('Please fill in all fields', UI.TOAST_TYPES.WARNING);
        return;
    }

    try {
        UI.showToast('Validating credentials...', UI.TOAST_TYPES.INFO);

        await GitHub.validateToken(token);
        await GitHub.validateRepo(repo, token);

        Storage.setPAT(token);
        Storage.setRepo(repo);

        await initWithCredentials();

        UI.showToast('Connected successfully!', UI.TOAST_TYPES.SUCCESS);
    } catch (error) {
        UI.showToast(error.message || 'Connection failed', UI.TOAST_TYPES.ERROR);
    }
}

/**
 * Switch to a different view
 * @param {string} view 
 */
function switchView(view) {
    if (isDirty && currentView === 'editor' && view !== 'editor') {
        if (!confirm('Discard unsaved changes?')) {
            return;
        }
        isDirty = false;
    }

    currentView = view;

    UI.$$('.nav-btn').forEach(btn => {
        UI.toggleClass(btn, 'active', btn.dataset.view === view);
        btn.setAttribute('aria-current', btn.dataset.view === view ? 'page' : 'false');
    });

    UI.$$('.view').forEach(v => {
        UI.toggleClass(v, 'active', v.id === `view-${view}`);
    });

    switch (view) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'editor':
            loadEntry(currentDate);
            break;
        case 'timeline':
            renderTimeline();
            break;
        case 'analytics':
            renderAnalytics(7);
            break;
    }
}

/**
 * Update UI state
 */
function updateUI() {
    const today = Journal.getTodayDate();
    const todayDateEl = UI.$('#today-date');
    if (todayDateEl) {
        todayDateEl.textContent = Journal.formatDate(today);
    }

    const streak = Analytics.calculateStreak();
    UI.updateStreakBadge(streak);

    if (GitHub.isOnline()) {
        const pending = Storage.getPending();
        if (pending.length > 0) {
            UI.updateSyncStatus('pending', `${pending.length} pending`);
        } else {
            UI.updateSyncStatus('synced', 'Synced');
        }
    } else {
        UI.updateSyncStatus('offline', 'Offline');
    }
}

/**
 * Render dashboard view
 */
function renderDashboard() {
    const summary = Analytics.getSummary();

    UI.$('#stat-streak').textContent = summary.currentStreak.toString();
    UI.$('#stat-entries').textContent = summary.totalEntries.toString();
    UI.$('#stat-avg').textContent = summary.avg7Day.toFixed(1);

    const today = Journal.getTodayDate();
    const todayEntry = Storage.getEntry(today);
    const todayStatus = UI.$('#today-status');

    if (todayEntry && todayEntry.markdown) {
        todayStatus.innerHTML = `
      <div class="today-complete">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <p>Today's entry is complete!</p>
        <button class="btn btn-ghost" id="edit-today-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Edit Entry
        </button>
      </div>
    `;

        UI.$('#edit-today-btn')?.addEventListener('click', () => {
            currentDate = today;
            switchView('editor');
        });
    }

    const recentDates = Index.getRecent(5);
    const recentList = UI.$('#recent-entries');

    if (recentDates.length === 0) {
        recentList.innerHTML = '<li class="entry-empty">No entries yet. Start your journey today!</li>';
    } else {
        recentList.innerHTML = recentDates.map(date => {
            const entry = Storage.getEntry(date);
            let score = '-';

            if (entry && entry.markdown) {
                const parsed = Journal.fromMarkdown(entry.markdown);
                score = parsed.score || '-';
            }

            const dateParts = Journal.parseDateParts(date);

            return `
        <li class="entry-item" data-date="${date}">
          <span class="entry-date">${dateParts.month} ${dateParts.day}</span>
          <span class="entry-score">
            Score: <span class="entry-score-value">${score}</span>/10
          </span>
        </li>
      `;
        }).join('');

        recentList.querySelectorAll('.entry-item').forEach(item => {
            item.addEventListener('click', () => {
                currentDate = item.dataset.date;
                switchView('editor');
            });
        });
    }

    renderScoreChart();
}

/**
 * Render score chart on dashboard
 */
function renderScoreChart() {
    const canvas = UI.$('#score-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = Analytics.getScoreTrend(7);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i += 2) {
        const y = padding + chartHeight - (i / 10) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    if (data.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet', width / 2, height / 2);
        return;
    }

    const stepX = chartWidth / Math.max(data.length - 1, 1);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = padding + chartHeight - (point.score / 10) * chartHeight;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    data.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = padding + chartHeight - (point.score / 10) * chartHeight;

        ctx.fillStyle = '#0a0a0f';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        const dateParts = Journal.parseDateParts(point.date);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dateParts.month} ${dateParts.day}`, x, height - 10);
    });
}

/**
 * Load entry into editor
 * @param {string} date 
 */
async function loadEntry(date) {
    const dateInput = UI.$('#entry-date');
    if (dateInput) {
        dateInput.value = date;
    }

    let entry = null;
    const cached = Storage.getEntry(date);

    if (cached && cached.markdown) {
        entry = Journal.fromMarkdown(cached.markdown);
    } else if (GitHub.isOnline()) {
        try {
            const remote = await GitHub.getEntry(date);
            if (remote) {
                Storage.saveEntry(date, {
                    markdown: remote.content,
                    sha: remote.sha,
                    synced: true
                });
                entry = Journal.fromMarkdown(remote.content);
            }
        } catch {
        }
    }

    if (!entry) {
        entry = Journal.createEntry(date);
    }

    populateForm(entry);
    isDirty = false;
}

/**
 * Populate editor form with entry data
 * @param {Object} entry 
 */
function populateForm(entry) {
    const scoreFields = ['score', 'discipline', 'focus', 'energy', 'mood'];

    for (const field of scoreFields) {
        const input = UI.$(`#score-${field === 'score' ? 'overall' : field}`);
        if (input) {
            input.value = entry[field] || 5;
            const display = UI.$(`.score-value[data-for="${input.id}"]`);
            if (display) {
                display.textContent = input.value;
            }
        }
    }

    const netWorthInput = UI.$('#net-worth-delta');
    if (netWorthInput) {
        netWorthInput.value = entry.net_worth_delta || 0;
    }

    for (let i = 1; i <= 11; i++) {
        const textarea = UI.$(`#section-${i}`);
        if (textarea) {
            textarea.value = entry[`section_${i}`] || '';
        }
    }

    const subsections = ['a', 'b', 'c', 'd', 'e'];
    for (const sub of subsections) {
        const textarea = UI.$(`#section-4${sub}`);
        if (textarea) {
            textarea.value = entry[`section_4${sub}`] || '';
        }
    }
}

/**
 * Get entry data from editor form
 * @returns {Object}
 */
function getFormData() {
    const entry = {
        schema: Journal.CURRENT_SCHEMA,
        date: currentDate,
        score: parseInt(UI.$('#score-overall')?.value || '5', 10),
        discipline: parseInt(UI.$('#score-discipline')?.value || '5', 10),
        focus: parseInt(UI.$('#score-focus')?.value || '5', 10),
        energy: parseInt(UI.$('#score-energy')?.value || '5', 10),
        mood: parseInt(UI.$('#score-mood')?.value || '5', 10),
        net_worth_delta: parseFloat(UI.$('#net-worth-delta')?.value || '0')
    };

    for (let i = 1; i <= 11; i++) {
        const textarea = UI.$(`#section-${i}`);
        if (textarea) {
            entry[`section_${i}`] = textarea.value;
        }
    }

    const subsections = ['a', 'b', 'c', 'd', 'e'];
    for (const sub of subsections) {
        const textarea = UI.$(`#section-4${sub}`);
        if (textarea) {
            entry[`section_4${sub}`] = textarea.value;
        }
    }

    return entry;
}

/**
 * Save current entry
 */
async function saveCurrentEntry() {
    const entry = getFormData();

    const validation = Journal.validateEntry(entry);
    if (!validation.valid) {
        UI.showToast(validation.errors[0], UI.TOAST_TYPES.ERROR);
        return;
    }

    const markdown = Journal.toMarkdown(entry);

    const cached = Storage.getEntry(currentDate);

    Storage.saveEntry(currentDate, {
        markdown,
        sha: cached?.sha || null,
        synced: false
    });

    Index.addDate(currentDate);

    isDirty = false;

    if (GitHub.isOnline()) {
        await syncEntry(currentDate);
    } else {
        Storage.markPending(currentDate);
        UI.showToast('Saved locally (will sync when online)', UI.TOAST_TYPES.WARNING);
        UI.updateSyncStatus('pending', '1 pending');
    }

    updateUI();
}

/**
 * Sync single entry to GitHub
 * @param {string} date 
 */
async function syncEntry(date) {
    const entry = Storage.getEntry(date);
    if (!entry || !entry.markdown) return;

    UI.updateSyncStatus('syncing', 'Saving...');

    try {
        const result = await GitHub.saveEntry(date, entry.markdown, entry.sha);
        Storage.markSynced(date, result.sha);
        UI.showToast('Entry saved', UI.TOAST_TYPES.SUCCESS);
        UI.updateSyncStatus('synced', 'Synced');
    } catch (error) {
        Storage.markPending(date);
        UI.showToast('Sync failed - saved locally', UI.TOAST_TYPES.WARNING);
        UI.updateSyncStatus('failed', 'Sync failed');
    }
}

/**
 * Sync all pending entries
 */
async function syncPendingEntries() {
    if (syncInProgress || !GitHub.isOnline()) return;

    const pending = Storage.getPending();
    if (pending.length === 0) return;

    syncInProgress = true;
    UI.updateSyncStatus('syncing', `Syncing ${pending.length}...`);

    for (const date of pending) {
        try {
            await syncEntry(date);
        } catch {
        }
    }

    syncInProgress = false;

    const remaining = Storage.getPending();
    if (remaining.length === 0) {
        UI.updateSyncStatus('synced', 'Synced');
    } else {
        UI.updateSyncStatus('pending', `${remaining.length} pending`);
    }
}

/**
 * Check and sync pending entries periodically
 */
function checkPendingSync() {
    if (GitHub.isOnline()) {
        syncPendingEntries();
    }
}

/**
 * Navigate to previous/next day
 * @param {number} delta - -1 or 1
 */
function navigateDay(delta) {
    if (isDirty && !confirm('Discard unsaved changes?')) {
        return;
    }

    currentDate = delta < 0
        ? Journal.getPreviousDate(currentDate)
        : Journal.getNextDate(currentDate);

    loadEntry(currentDate);
}

/**
 * Discard changes in editor
 */
function discardChanges() {
    if (!isDirty || confirm('Discard all changes?')) {
        isDirty = false;
        loadEntry(currentDate);
    }
}

/**
 * Mark editor as having unsaved changes
 */
function markDirty() {
    isDirty = true;
}

/**
 * Render timeline view
 */
function renderTimeline() {
    const { dates, page, totalPages, hasNext, hasPrev, totalCount } = Index.getPage();

    const listEl = UI.$('#timeline-list');

    if (dates.length === 0) {
        listEl.innerHTML = '<p class="timeline-empty">No entries found.</p>';
    } else {
        listEl.innerHTML = dates.map(date => {
            const entry = Storage.getEntry(date);
            const dateParts = Journal.parseDateParts(date);
            let score = '-';
            let preview = 'No content';

            if (entry && entry.markdown) {
                const parsed = Journal.fromMarkdown(entry.markdown);
                score = parsed.score || '-';
                preview = parsed.section_1 || parsed.section_2 || 'No content';
                if (preview.length > 60) {
                    preview = preview.substring(0, 60) + '...';
                }
            }

            return `
        <div class="timeline-item" data-date="${date}">
          <div class="timeline-item-date">
            <span class="timeline-item-day">${dateParts.day}</span>
            <span class="timeline-item-month">${dateParts.month}</span>
          </div>
          <div class="timeline-item-content">
            <div class="timeline-item-title">${Journal.formatDate(date)}</div>
            <div class="timeline-item-preview">${preview}</div>
          </div>
          <div class="timeline-item-score">${score}</div>
        </div>
      `;
        }).join('');

        listEl.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', () => {
                currentDate = item.dataset.date;
                switchView('editor');
            });
        });
    }

    UI.$('#page-info').textContent = `Page ${page} of ${totalPages} (${totalCount} entries)`;
    UI.$('#prev-page-btn').disabled = !hasPrev;
    UI.$('#next-page-btn').disabled = !hasNext;
}

/**
 * Render analytics view
 * @param {number} days 
 */
function renderAnalytics(days) {
    const summary = Analytics.getSummary();

    UI.$('#analytics-streak').textContent = summary.currentStreak.toString();
    UI.$('#analytics-longest').textContent = summary.longestStreak.toString();
    UI.$('#analytics-completion').textContent = `${summary.completionRate}%`;
    UI.$('#analytics-missed').textContent = summary.daysMissed.toString();

    UI.$('#avg-7').textContent = summary.avg7Day.toFixed(1);
    UI.$('#avg-30').textContent = summary.avg30Day.toFixed(1);
    UI.$('#avg-all').textContent = summary.avgAllTime.toFixed(1);

    renderTrendsChart(days);
    renderDisciplineChart(days);
}

/**
 * Render trends line chart
 * @param {number} days 
 */
function renderTrendsChart(days) {
    const canvas = UI.$('#trends-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const metrics = Analytics.getAllMetricsTrend(days);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i += 2) {
        const y = padding + chartHeight - (i / 10) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    if (metrics.dates.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet', width / 2, height / 2);
        return;
    }

    const colors = {
        score: '#d4af37',
        discipline: '#4a9eff',
        focus: '#22c55e',
        energy: '#f59e0b',
        mood: '#a855f7'
    };

    const stepX = chartWidth / Math.max(metrics.dates.length - 1, 1);

    for (const [metric, color] of Object.entries(colors)) {
        const data = metrics[metric];

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, i) => {
            const x = padding + i * stepX;
            const y = padding + chartHeight - (value / 10) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    const legendY = height - 15;
    const legendSpacing = 100;
    const legendStart = (width - (Object.keys(colors).length * legendSpacing)) / 2;

    Object.entries(colors).forEach(([metric, color], i) => {
        const x = legendStart + i * legendSpacing;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, legendY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a0a0b0';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(metric.charAt(0).toUpperCase() + metric.slice(1), x + 10, legendY + 4);
    });
}

/**
 * Render discipline breakdown radar/pie chart
 * @param {number} days 
 */
function renderDisciplineChart(days) {
    const canvas = UI.$('#discipline-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const breakdown = Analytics.getDisciplineBreakdown(days);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    ctx.clearRect(0, 0, width, height);

    const metrics = ['discipline', 'focus', 'energy', 'mood'];
    const colors = ['#4a9eff', '#22c55e', '#f59e0b', '#a855f7'];
    const angleStep = (Math.PI * 2) / metrics.length;

    for (let i = 1; i <= 5; i++) {
        const r = (radius * i) / 5;
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    metrics.forEach((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        ctx.strokeStyle = '#2a2a3a';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
        );
        ctx.stroke();
    });

    ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();

    metrics.forEach((metric, i) => {
        const value = breakdown[metric] || 0;
        const r = (radius * value) / 10;
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    metrics.forEach((metric, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = radius + 20;
        const x = centerX + Math.cos(angle) * labelR;
        const y = centerY + Math.sin(angle) * labelR;

        ctx.fillStyle = colors[i];
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(metric.charAt(0).toUpperCase() + metric.slice(1), x, y);

        const value = breakdown[metric] || 0;
        ctx.fillStyle = '#e8e8ed';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(value.toFixed(1), x, y + 14);
    });
}

document.addEventListener('DOMContentLoaded', init);

export {
    init,
    switchView,
    saveCurrentEntry,
    loadEntry
};
