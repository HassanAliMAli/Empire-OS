/**
 * Empire OS - Journal Module
 * Schema validation, markdown conversion, and entry management
 */

const CURRENT_SCHEMA = 1;

const SECTIONS = [
  { id: 1, title: 'Identity & North Star', key: 'section_1' },
  { id: 2, title: 'Top 1-3 Priorities', key: 'section_2' },
  { id: 3, title: 'Time & Focus Plan', key: 'section_3' },
  { id: 4, title: 'Execution Checklist', key: 'section_4', subsections: ['Health', 'Skill', 'Money', 'Leverage', 'Mind'] },
  { id: 5, title: 'Personal Balance Sheet', key: 'section_5' },
  { id: 6, title: 'Decisions & Thinking Log', key: 'section_6' },
  { id: 7, title: 'Failure & Weakness Audit', key: 'section_7' },
  { id: 8, title: 'Fix & Upgrade Plan', key: 'section_8' },
  { id: 9, title: 'Wins & Progress', key: 'section_9' },
  { id: 10, title: 'Self-Score (0-10)', key: 'section_10' },
  { id: 11, title: 'Night Close Reflection', key: 'section_11' }
];

const DEFAULT_SCORES = {
  score: 5,
  discipline: 5,
  focus: 5,
  energy: 5,
  mood: 5,
  net_worth_delta: 0
};

/**
 * Create a new empty journal entry
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Object} New entry object
 */
function createEntry(date) {
  const entry = {
    schema: CURRENT_SCHEMA,
    date: date,
    ...DEFAULT_SCORES,
    section_1: '',
    section_2: '',
    section_3: '',
    section_4a: '',
    section_4b: '',
    section_4c: '',
    section_4d: '',
    section_4e: '',
    section_5: '',
    section_6: '',
    section_7: '',
    section_8: '',
    section_9: '',
    section_10: '',
    section_11: ''
  };
  return entry;
}

/**
 * Validate an entry against the schema
 * @param {Object} entry - Entry to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateEntry(entry) {
  const errors = [];
  
  if (!entry) {
    errors.push('Entry is null or undefined');
    return { valid: false, errors };
  }
  
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push('Invalid date format. Expected YYYY-MM-DD');
  }
  
  const scoreFields = ['score', 'discipline', 'focus', 'energy', 'mood'];
  for (const field of scoreFields) {
    if (entry[field] !== undefined) {
      const val = Number(entry[field]);
      if (isNaN(val) || val < 0 || val > 10) {
        errors.push(`${field} must be a number between 0 and 10`);
      }
    }
  }
  
  if (entry.net_worth_delta !== undefined && isNaN(Number(entry.net_worth_delta))) {
    errors.push('net_worth_delta must be a number');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Convert entry object to Markdown string
 * @param {Object} entry - Entry object
 * @returns {string} Markdown string
 */
function toMarkdown(entry) {
  const lines = [];
  
  lines.push('---');
  lines.push(`schema: ${entry.schema || CURRENT_SCHEMA}`);
  lines.push(`date: ${entry.date}`);
  lines.push(`score: ${entry.score}`);
  lines.push(`discipline: ${entry.discipline}`);
  lines.push(`focus: ${entry.focus}`);
  lines.push(`energy: ${entry.energy}`);
  lines.push(`mood: ${entry.mood}`);
  lines.push(`net_worth_delta: ${entry.net_worth_delta}`);
  lines.push('---');
  lines.push('');
  
  lines.push('# 1. Identity & North Star');
  lines.push(entry.section_1 || '');
  lines.push('');
  
  lines.push('# 2. Top 1-3 Priorities');
  lines.push(entry.section_2 || '');
  lines.push('');
  
  lines.push('# 3. Time & Focus Plan');
  lines.push(entry.section_3 || '');
  lines.push('');
  
  lines.push('# 4. Execution Checklist');
  lines.push('');
  lines.push('## Health');
  lines.push(entry.section_4a || '');
  lines.push('');
  lines.push('## Skill');
  lines.push(entry.section_4b || '');
  lines.push('');
  lines.push('## Money');
  lines.push(entry.section_4c || '');
  lines.push('');
  lines.push('## Leverage');
  lines.push(entry.section_4d || '');
  lines.push('');
  lines.push('## Mind');
  lines.push(entry.section_4e || '');
  lines.push('');
  
  lines.push('# 5. Personal Balance Sheet');
  lines.push(entry.section_5 || '');
  lines.push('');
  
  lines.push('# 6. Decisions & Thinking Log');
  lines.push(entry.section_6 || '');
  lines.push('');
  
  lines.push('# 7. Failure & Weakness Audit');
  lines.push(entry.section_7 || '');
  lines.push('');
  
  lines.push('# 8. Fix & Upgrade Plan');
  lines.push(entry.section_8 || '');
  lines.push('');
  
  lines.push('# 9. Wins & Progress');
  lines.push(entry.section_9 || '');
  lines.push('');
  
  lines.push('# 10. Self-Score (0-10)');
  lines.push(entry.section_10 || '');
  lines.push('');
  
  lines.push('# 11. Night Close Reflection');
  lines.push(entry.section_11 || '');
  
  return lines.join('\n');
}

/**
 * Parse frontmatter from markdown string
 * @param {string} markdown - Markdown string
 * @returns {{frontmatter: Object, content: string}}
 */
function parseFrontmatter(markdown) {
  const frontmatter = {};
  let content = markdown;
  
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    const yamlBlock = match[1];
    content = match[2];
    
    const lines = yamlBlock.split(/\r?\n/);
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        
        if (!isNaN(Number(value))) {
          value = Number(value);
        }
        
        frontmatter[key] = value;
      }
    }
  }
  
  return { frontmatter, content };
}

/**
 * Parse section content from markdown
 * @param {string} content - Markdown content (without frontmatter)
 * @returns {Object} Sections object
 */
function parseSections(content) {
  const sections = {};
  const lines = content.split(/\r?\n/);
  
  let currentSection = null;
  let currentSubsection = null;
  let buffer = [];
  
  const flushBuffer = () => {
    if (currentSection !== null) {
      const key = currentSubsection ? `section_${currentSection}${currentSubsection}` : `section_${currentSection}`;
      sections[key] = buffer.join('\n').trim();
    }
    buffer = [];
  };
  
  for (const line of lines) {
    const mainMatch = line.match(/^#\s+(\d+)\./);
    if (mainMatch) {
      flushBuffer();
      currentSection = parseInt(mainMatch[1], 10);
      currentSubsection = null;
      continue;
    }
    
    const subMatch = line.match(/^##\s+(Health|Skill|Money|Leverage|Mind)/i);
    if (subMatch && currentSection === 4) {
      flushBuffer();
      const subName = subMatch[1].toLowerCase();
      const subMap = { health: 'a', skill: 'b', money: 'c', leverage: 'd', mind: 'e' };
      currentSubsection = subMap[subName];
      continue;
    }
    
    buffer.push(line);
  }
  
  flushBuffer();
  
  return sections;
}

/**
 * Convert Markdown string to entry object
 * @param {string} markdown - Markdown string
 * @returns {Object} Entry object
 */
function fromMarkdown(markdown) {
  const { frontmatter, content } = parseFrontmatter(markdown);
  const sections = parseSections(content);
  
  const entry = {
    schema: frontmatter.schema || 1,
    date: frontmatter.date || '',
    score: frontmatter.score ?? 5,
    discipline: frontmatter.discipline ?? 5,
    focus: frontmatter.focus ?? 5,
    energy: frontmatter.energy ?? 5,
    mood: frontmatter.mood ?? 5,
    net_worth_delta: frontmatter.net_worth_delta ?? 0,
    ...sections
  };
  
  return migrateEntry(entry);
}

/**
 * Migrate entry to current schema version
 * @param {Object} entry - Entry to migrate
 * @returns {Object} Migrated entry
 */
function migrateEntry(entry) {
  let version = entry.schema || 1;
  
  const migrations = {
  };
  
  while (version < CURRENT_SCHEMA) {
    const key = `${version}→${version + 1}`;
    if (migrations[key]) {
      entry = migrations[key](entry);
    }
    version++;
  }
  
  entry.schema = CURRENT_SCHEMA;
  return entry;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get previous date
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function getPreviousDate(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Get next date
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function getNextDate(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Format date for display
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Parse date for timeline display
 * @param {string} date - YYYY-MM-DD
 * @returns {{day: string, month: string, year: string}}
 */
function parseDateParts(date) {
  const d = new Date(date);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    year: d.getFullYear().toString()
  };
}

export {
  CURRENT_SCHEMA,
  SECTIONS,
  DEFAULT_SCORES,
  createEntry,
  validateEntry,
  toMarkdown,
  fromMarkdown,
  migrateEntry,
  getTodayDate,
  getPreviousDate,
  getNextDate,
  formatDate,
  parseDateParts
};
