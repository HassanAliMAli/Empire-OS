/**
 * Empire OS - Analytics Module
 * Metrics computation and statistics
 */

import * as Storage from './storage.js';
import * as Index from './index.js';
import { fromMarkdown, getPreviousDate } from './journal.js';

/**
 * Calculate current streak
 * @returns {number}
 */
function calculateStreak() {
    const entries = Storage.getEntries();
    const today = new Date().toISOString().split('T')[0];

    let streak = 0;
    let checkDate = today;

    for (let i = 0; i < 1000; i++) {
        if (entries[checkDate] && entries[checkDate].synced) {
            streak++;
            checkDate = getPreviousDate(checkDate);
        } else if (checkDate === today && !entries[checkDate]) {
            checkDate = getPreviousDate(checkDate);
            continue;
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Calculate longest streak ever
 * @returns {number}
 */
function calculateLongestStreak() {
    const dates = Index.getAllDates().sort();
    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }

    return dates.length > 0 ? longest : 0;
}

/**
 * Calculate completion rate for a period
 * @param {number} days - Number of days to check
 * @returns {number} Percentage 0-100
 */
function calculateCompletionRate(days = 30) {
    const dates = Index.getAllDates();
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    let completed = 0;
    const checkDate = new Date(startDate);

    while (checkDate <= today) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
            completed++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    return Math.round((completed / days) * 100);
}

/**
 * Calculate days missed in period
 * @param {number} days 
 * @returns {number}
 */
function calculateDaysMissed(days = 30) {
    const completionRate = calculateCompletionRate(days);
    return Math.round(days * (1 - completionRate / 100));
}

/**
 * Get average score for a period
 * @param {number} days 
 * @returns {number}
 */
function getAverageScore(days = 7) {
    const entries = Storage.getEntries();
    const dates = Index.getAllDates();
    const recentDates = dates.slice(0, days);

    if (recentDates.length === 0) return 0;

    let total = 0;
    let count = 0;

    for (const date of recentDates) {
        const entry = entries[date];
        if (entry && entry.markdown) {
            const parsed = fromMarkdown(entry.markdown);
            if (parsed.score !== undefined) {
                total += parsed.score;
                count++;
            }
        }
    }

    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

/**
 * Get rolling average for specific metric
 * @param {string} metric - 'score', 'discipline', 'focus', 'energy', 'mood'
 * @param {number} days 
 * @returns {number}
 */
function getRollingAverage(metric, days = 7) {
    const entries = Storage.getEntries();
    const dates = Index.getAllDates();
    const recentDates = dates.slice(0, days);

    if (recentDates.length === 0) return 0;

    let total = 0;
    let count = 0;

    for (const date of recentDates) {
        const entry = entries[date];
        if (entry && entry.markdown) {
            const parsed = fromMarkdown(entry.markdown);
            if (parsed[metric] !== undefined) {
                total += parsed[metric];
                count++;
            }
        }
    }

    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

/**
 * Get score trend data for charting
 * @param {number} days 
 * @returns {Array<{date: string, score: number}>}
 */
function getScoreTrend(days = 7) {
    const entries = Storage.getEntries();
    const dates = Index.getAllDates();
    const recentDates = dates.slice(0, days).reverse();

    return recentDates.map(date => {
        const entry = entries[date];
        let score = 0;

        if (entry && entry.markdown) {
            const parsed = fromMarkdown(entry.markdown);
            score = parsed.score || 0;
        }

        return { date, score };
    });
}

/**
 * Get all metrics trend data
 * @param {number} days 
 * @returns {Object}
 */
function getAllMetricsTrend(days = 7) {
    const entries = Storage.getEntries();
    const dates = Index.getAllDates();
    const recentDates = dates.slice(0, days).reverse();

    const metrics = {
        dates: [],
        score: [],
        discipline: [],
        focus: [],
        energy: [],
        mood: []
    };

    for (const date of recentDates) {
        metrics.dates.push(date);
        const entry = entries[date];

        if (entry && entry.markdown) {
            const parsed = fromMarkdown(entry.markdown);
            metrics.score.push(parsed.score || 0);
            metrics.discipline.push(parsed.discipline || 0);
            metrics.focus.push(parsed.focus || 0);
            metrics.energy.push(parsed.energy || 0);
            metrics.mood.push(parsed.mood || 0);
        } else {
            metrics.score.push(0);
            metrics.discipline.push(0);
            metrics.focus.push(0);
            metrics.energy.push(0);
            metrics.mood.push(0);
        }
    }

    return metrics;
}

/**
 * Get discipline breakdown averages
 * @param {number} days 
 * @returns {Object}
 */
function getDisciplineBreakdown(days = 30) {
    return {
        discipline: getRollingAverage('discipline', days),
        focus: getRollingAverage('focus', days),
        energy: getRollingAverage('energy', days),
        mood: getRollingAverage('mood', days)
    };
}

/**
 * Get net worth trend
 * @param {number} days 
 * @returns {Array<{date: string, delta: number, cumulative: number}>}
 */
function getNetWorthTrend(days = 30) {
    const entries = Storage.getEntries();
    const dates = Index.getAllDates();
    const recentDates = dates.slice(0, days).reverse();

    let cumulative = 0;

    return recentDates.map(date => {
        const entry = entries[date];
        let delta = 0;

        if (entry && entry.markdown) {
            const parsed = fromMarkdown(entry.markdown);
            delta = parsed.net_worth_delta || 0;
        }

        cumulative += delta;

        return { date, delta, cumulative };
    });
}

/**
 * Get summary statistics
 * @returns {Object}
 */
function getSummary() {
    return {
        totalEntries: Index.getTotalCount(),
        currentStreak: calculateStreak(),
        longestStreak: calculateLongestStreak(),
        completionRate: calculateCompletionRate(30),
        daysMissed: calculateDaysMissed(30),
        avg7Day: getAverageScore(7),
        avg30Day: getAverageScore(30),
        avgAllTime: getAverageScore(Index.getTotalCount())
    };
}

export {
    calculateStreak,
    calculateLongestStreak,
    calculateCompletionRate,
    calculateDaysMissed,
    getAverageScore,
    getRollingAverage,
    getScoreTrend,
    getAllMetricsTrend,
    getDisciplineBreakdown,
    getNetWorthTrend,
    getSummary
};
