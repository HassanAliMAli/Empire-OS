/**
 * Empire OS - Index Module
 * Entry listing, pagination, and search
 */

import * as Storage from './storage.js';

const PAGE_SIZE = 50;

let _index = [];
let _currentPage = 1;
let _searchQuery = '';

/**
 * Initialize index from storage
 */
function init() {
    _index = Storage.getIndex();
    _currentPage = 1;
    _searchQuery = '';
}

/**
 * Update index with new dates
 * @param {string[]} dates 
 */
function setDates(dates) {
    _index = [...dates].sort().reverse();
    Storage.setIndex(_index);
}

/**
 * Add date to index
 * @param {string} date 
 */
function addDate(date) {
    if (!_index.includes(date)) {
        _index.push(date);
        _index.sort().reverse();
        Storage.setIndex(_index);
    }
}

/**
 * Remove date from index
 * @param {string} date 
 */
function removeDate(date) {
    _index = _index.filter(d => d !== date);
    Storage.setIndex(_index);
}

/**
 * Get all dates
 * @returns {string[]}
 */
function getAllDates() {
    return [..._index];
}

/**
 * Get total entry count
 * @returns {number}
 */
function getTotalCount() {
    return _index.length;
}

/**
 * Set search query
 * @param {string} query 
 */
function setSearchQuery(query) {
    _searchQuery = query.toLowerCase().trim();
    _currentPage = 1;
}

/**
 * Get filtered dates based on search
 * @returns {string[]}
 */
function getFilteredDates() {
    if (!_searchQuery) {
        return _index;
    }

    return _index.filter(date => {
        if (date.includes(_searchQuery)) {
            return true;
        }

        const entry = Storage.getEntry(date);
        if (entry && entry.markdown) {
            return entry.markdown.toLowerCase().includes(_searchQuery);
        }

        return false;
    });
}

/**
 * Get paginated dates
 * @returns {{dates: string[], page: number, totalPages: number, hasNext: boolean, hasPrev: boolean}}
 */
function getPage() {
    const filtered = getFilteredDates();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    _currentPage = Math.min(_currentPage, totalPages);
    _currentPage = Math.max(1, _currentPage);

    const start = (_currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const dates = filtered.slice(start, end);

    return {
        dates,
        page: _currentPage,
        totalPages,
        hasNext: _currentPage < totalPages,
        hasPrev: _currentPage > 1,
        totalCount: filtered.length
    };
}

/**
 * Go to next page
 * @returns {boolean}
 */
function nextPage() {
    const { hasNext } = getPage();
    if (hasNext) {
        _currentPage++;
        return true;
    }
    return false;
}

/**
 * Go to previous page
 * @returns {boolean}
 */
function prevPage() {
    if (_currentPage > 1) {
        _currentPage--;
        return true;
    }
    return false;
}

/**
 * Go to specific page
 * @param {number} page 
 */
function goToPage(page) {
    _currentPage = Math.max(1, page);
}

/**
 * Get recent entries
 * @param {number} count 
 * @returns {string[]}
 */
function getRecent(count = 5) {
    return _index.slice(0, count);
}

/**
 * Check if date exists in index
 * @param {string} date 
 * @returns {boolean}
 */
function hasDate(date) {
    return _index.includes(date);
}

/**
 * Get entry count for a specific month
 * @param {number} year 
 * @param {number} month - 1-12
 * @returns {number}
 */
function getMonthCount(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return _index.filter(d => d.startsWith(prefix)).length;
}

/**
 * Get dates for a specific month
 * @param {number} year 
 * @param {number} month - 1-12
 * @returns {string[]}
 */
function getMonthDates(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return _index.filter(d => d.startsWith(prefix));
}

/**
 * Get dates in range
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string[]}
 */
function getDateRange(startDate, endDate) {
    return _index.filter(d => d >= startDate && d <= endDate);
}

export {
    PAGE_SIZE,
    init,
    setDates,
    addDate,
    removeDate,
    getAllDates,
    getTotalCount,
    setSearchQuery,
    getFilteredDates,
    getPage,
    nextPage,
    prevPage,
    goToPage,
    getRecent,
    hasDate,
    getMonthCount,
    getMonthDates,
    getDateRange
};
