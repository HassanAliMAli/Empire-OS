/**
 * Empire OS - Export Module
 * Export entries as ZIP or JSON
 */

import * as Storage from './storage.js';
import * as Index from './index.js';

/**
 * Download file to user's computer
 * @param {string} filename 
 * @param {string|Blob} content 
 * @param {string} mimeType 
 */
function downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Export all entries as JSON
 * @returns {Promise<void>}
 */
async function exportAsJSON() {
    const entries = Storage.getEntries();
    const index = Index.getAllDates();

    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalEntries: index.length,
        entries: {}
    };

    for (const date of index) {
        const entry = entries[date];
        if (entry && entry.markdown) {
            exportData.entries[date] = {
                markdown: entry.markdown,
                synced: entry.synced,
                sha: entry.sha,
                updatedAt: entry.updatedAt
            };
        }
    }

    const json = JSON.stringify(exportData, null, 2);
    const filename = `empire-os-export-${new Date().toISOString().split('T')[0]}.json`;

    downloadFile(filename, json, 'application/json');
}

/**
 * Create ZIP file from entries (using browser APIs)
 * Simple ZIP implementation without external libraries
 * @returns {Promise<Blob>}
 */
async function createZipBlob() {
    const entries = Storage.getEntries();
    const index = Index.getAllDates();

    const files = [];

    for (const date of index) {
        const entry = entries[date];
        if (entry && entry.markdown) {
            files.push({
                name: `entries/${date}.md`,
                content: entry.markdown
            });
        }
    }

    const textEncoder = new TextEncoder();
    const zip = [];
    const centralDirectory = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = textEncoder.encode(file.name);
        const contentBytes = textEncoder.encode(file.content);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(localHeader.buffer);

        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        view.setUint32(14, 0, true);
        view.setUint32(18, contentBytes.length, true);
        view.setUint32(22, contentBytes.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        zip.push(localHeader);
        zip.push(contentBytes);

        const cdHeader = new Uint8Array(46 + nameBytes.length);
        const cdView = new DataView(cdHeader.buffer);

        cdView.setUint32(0, 0x02014b50, true);
        cdView.setUint16(4, 20, true);
        cdView.setUint16(6, 20, true);
        cdView.setUint16(8, 0, true);
        cdView.setUint16(10, 0, true);
        cdView.setUint16(12, 0, true);
        cdView.setUint16(14, 0, true);
        cdView.setUint32(16, 0, true);
        cdView.setUint32(20, contentBytes.length, true);
        cdView.setUint32(24, contentBytes.length, true);
        cdView.setUint16(28, nameBytes.length, true);
        cdView.setUint16(30, 0, true);
        cdView.setUint16(32, 0, true);
        cdView.setUint16(34, 0, true);
        cdView.setUint16(36, 0, true);
        cdView.setUint32(38, 0, true);
        cdView.setUint32(42, offset, true);
        cdHeader.set(nameBytes, 46);

        centralDirectory.push(cdHeader);
        offset += localHeader.length + contentBytes.length;
    }

    let cdSize = 0;
    for (const cd of centralDirectory) {
        cdSize += cd.length;
        zip.push(cd);
    }

    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);

    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, cdSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    zip.push(endRecord);

    return new Blob(zip, { type: 'application/zip' });
}

/**
 * Export all entries as ZIP
 * @returns {Promise<void>}
 */
async function exportAsZIP() {
    const blob = await createZipBlob();
    const filename = `empire-os-backup-${new Date().toISOString().split('T')[0]}.zip`;

    downloadFile(filename, blob, 'application/zip');
}

/**
 * Export single entry as Markdown
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<void>}
 */
async function exportEntry(date) {
    const entry = Storage.getEntry(date);

    if (!entry || !entry.markdown) {
        throw new Error(`No entry found for ${date}`);
    }

    downloadFile(`${date}.md`, entry.markdown, 'text/markdown');
}

/**
 * Import entries from JSON export
 * @param {File} file 
 * @returns {Promise<{imported: number, skipped: number}>}
 */
async function importFromJSON(file) {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.entries || typeof data.entries !== 'object') {
        throw new Error('Invalid export file format');
    }

    let imported = 0;
    let skipped = 0;

    for (const [date, entry] of Object.entries(data.entries)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            skipped++;
            continue;
        }

        const existing = Storage.getEntry(date);
        if (existing && existing.synced) {
            skipped++;
            continue;
        }

        Storage.saveEntry(date, {
            markdown: entry.markdown,
            sha: entry.sha || null,
            synced: false
        });

        Index.addDate(date);
        imported++;
    }

    return { imported, skipped };
}

export {
    downloadFile,
    exportAsJSON,
    exportAsZIP,
    exportEntry,
    importFromJSON
};
