# 🏛️ Empire OS

**Muhammad Hassan Ali's Empire OS** — A personal, lifelong, elite daily journal and life operating system for building a trillion-dollar empire.

[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue)](https://pages.github.com/)
[![Zero Cost](https://img.shields.io/badge/Cost-$0%20Forever-green)](https://github.com)
[![Offline First](https://img.shields.io/badge/Offline-First-orange)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

## ✨ Features

- **📝 Daily Journal System** — Structured journaling with 11 powerful sections
- **💾 GitHub as Database** — All entries stored as Markdown files in your repository
- **🔄 Offline First** — Never lose data, syncs when back online
- **📊 Analytics & Insights** — Track streaks, scores, and trends over time
- **📱 PWA Support** — Install on any device, works like a native app
- **⌨️ Keyboard Shortcuts** — Navigate and save blazingly fast
- **📦 Export & Backup** — Download all entries as ZIP or JSON anytime
- **🔐 100% Private** — Your data stays in your repository, always

---

## 🎯 Journal Sections

Every daily entry includes these structured sections:

1. **Identity & North Star** — Your vision and purpose
2. **Top 1-3 Priorities** — The most important tasks for the day
3. **Time & Focus Plan** — How you'll structure your time
4. **Execution Checklist** — Health, Skill, Money, Leverage, Mind
5. **Personal Balance Sheet** — Assets and liabilities tracking
6. **Decisions & Thinking Log** — Key decisions and reasoning
7. **Failure & Weakness Audit** — What didn't work
8. **Fix & Upgrade Plan** — How you'll improve
9. **Wins & Progress** — Celebrate accomplishments
10. **Self-Score (0-10)** — Daily metrics for discipline, focus, energy, mood
11. **Night Close Reflection** — End of day gratitude and intentions

---

## 🚀 Quick Start

### 1. Fork This Repository

Click the **Fork** button at the top right to create your own copy.

### 2. Enable GitHub Pages

1. Go to your forked repository's **Settings**
2. Navigate to **Pages** (in the sidebar)
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**

Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME`

### 3. Create a Personal Access Token

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens/new)
2. Give it a name like "Empire OS"
3. Set expiration (or choose "No expiration" for convenience)
4. Select the **repo** scope (full control of private repositories)
5. Click **Generate token**
6. **Copy the token** — you won't see it again!

### 4. Open Your Empire OS

1. Visit your GitHub Pages URL
2. Paste your repository name (format: `username/repo-name`)
3. Paste your Personal Access Token
4. Click **Connect & Start**

**That's it!** Start journaling immediately.

---

## 📁 How Data is Stored

Your journal entries are stored as Markdown files in the `entries/` folder:

```
entries/
├── 2025-12-25.md
├── 2025-12-24.md
├── 2025-12-23.md
└── ...
```

Each file contains:
- **YAML frontmatter** with metrics (score, discipline, focus, energy, mood)
- **Markdown content** with all 11 journal sections

Example entry:
```markdown
---
schema: 1
date: 2025-12-25
score: 8
discipline: 9
focus: 7
energy: 8
mood: 8
net_worth_delta: 1000
---

# 1. Identity & North Star
I am building a trillion-dollar empire...

# 2. Top 1-3 Priorities
1. Complete product launch
2. Review quarterly financials
...
```

---

## 💾 Backup Your Data

### Automatic Backups
Your entries are automatically stored in your GitHub repository. Clone it anytime:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

### Manual Export
Use the built-in export feature:
- Press `Ctrl+E` to open export menu
- Choose **ZIP** (all entries as .md files) or **JSON** (structured data)

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Dashboard view |
| `2` | Editor view |
| `3` | Timeline view |
| `4` | Analytics view |
| `N` | New entry (today) |
| `T` | Jump to today |
| `S` or `Ctrl+S` | Save entry |
| `←` / `→` | Previous/Next day |
| `/` | Focus search |
| `Ctrl+E` | Export menu |
| `?` | Keyboard shortcuts help |
| `Esc` | Close modal |

---

## 🔐 Security

- **Token Security**: Your GitHub token is stored only in your browser's localStorage
- **Never exposed**: The token is never hardcoded or logged
- **HTTPS only**: GitHub Pages provides free SSL/HTTPS
- **Content Security Policy**: Strict CSP headers prevent XSS attacks
- **Private by default**: Use a private repository for maximum security

### ⚠️ Token Scope Warning

Only grant the **repo** scope. Never grant additional permissions.

If you suspect your token was compromised:
1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Delete the compromised token
3. Generate a new one
4. Update it in Empire OS settings

---

## 🏗️ Technical Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| UI | HTML5 | Maximum compatibility |
| Style | CSS with CSS Variables | No framework dependencies |
| Logic | Vanilla ES6 Modules | Zero npm, future-proof |
| Data | Markdown + YAML | Human + machine readable |
| Storage | GitHub API + localStorage | Free + offline capable |
| Hosting | GitHub Pages | Free HTTPS, global CDN |

**Philosophy**: Simple, durable, maintainable for 40+ years.

---

## 📊 Performance

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 1.5s
- **Total Bundle Size**: < 50KB
- **Works on 2G**: Yes (core features)
- **Handles 10,000+ entries**: Yes (paginated timeline)

---

## 🔮 Roadmap

Future enhancements (contributions welcome):

- [ ] Weekly/Monthly review summaries
- [ ] Rich text editor with Markdown preview
- [ ] Goal tracking and habit streaks
- [ ] Calendar heatmap visualization
- [ ] Multiple journal templates
- [ ] Data encryption at rest
- [ ] Multi-device sync notifications

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 💭 Philosophy

> *"Empire OS is not just a journal. It's a system for building your life's work. Every day, you design your destiny with intention and discipline."*

Built to last a lifetime. Built to shape a legacy.

---

**Start today. Build your empire.** 🏛️
