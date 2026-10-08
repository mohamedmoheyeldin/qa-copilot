# App Ideas: Overview and Comparison

Four portfolio apps built with **Untitled UI React** (React + Tailwind CSS v4 + React Aria + TypeScript).

- Website: https://www.untitledui.com/
- Components: https://www.untitledui.com/react/components

---

## The four ideas at a glance

| # | App | One-line pitch | Uses AI? | Effort | FDE story |
|---|-----|----------------|----------|--------|-----------|
| 1 | **Flaky Test Tracker** | Find, tag, and fix Playwright tests that fail intermittently | Optional | Small (1–2 weeks) | Good |
| 2 | **Test Results Dashboard** | Turn Playwright JSON reports into trends and insights | Optional | Medium (2–3 weeks) | Very good |
| 3 | **Test Case Generator** | Paste a user story, get test cases plus Playwright or Cypress code | Yes (core) | Medium (2–3 weeks) | Excellent |
| 4 | **Bug Report Writer** | Turn messy notes into clean, tracker-ready bug reports | Yes (core) | Small to medium (1–2 weeks) | Excellent |

Effort assumes evenings and weekends, MVP only.

---

## How they fit together

Ideas 1 and 2 share the same data (Playwright JSON reports), so they can live in **one app with two sections**:

```
QA Insights (one app)
├── Dashboard   → Idea 2
└── Flaky Tests → Idea 1
```

Ideas 3 and 4 share the same pattern (paste text → AI → structured output → copy/export), so they can also live in **one app**:

```
QA Copilot (one app)
├── Test Case Generator → Idea 3
└── Bug Report Writer   → Idea 4
```

Two apps, four features, less setup work.

---

## Quick recommendation

If you build only **one**, build **Test Case Generator**. It shows AI skill, QA depth, and the "take messy input and turn it into something useful" mindset FDE roles want.

If you build **two**, add **Test Results Dashboard**. It shows you can handle real engineering data and build a polished UI.

---

## Shared tech stack (all four)

| Layer | Choice |
|-------|--------|
| Framework | Vite + React + TypeScript (static build for GitHub Pages) |
| UI | Untitled UI React (copy components in with their CLI) |
| Styling | Tailwind CSS v4 |
| Charts | Untitled UI line, bar, and pie charts (built on Recharts) |
| AI (ideas 3, 4) | Bring-your-own-key, demo mode, or prompt-only mode (see `05-qa-copilot-build-plan.md`) |
| Storage | Browser storage only (localStorage / IndexedDB); settings export to JSON |
| Hosting | GitHub Pages, deployed with GitHub Actions |
| Testing | Playwright for the app itself (nice touch for a QA portfolio) |

**Note:** Untitled UI has a free open-source set and a paid PRO set. Some full-page examples (like Dashboards) may be PRO. The base and application components listed in each doc are a good starting point, but double-check the free/PRO label on each one before planning around it.

---

## Docs in this folder

- `01-flaky-test-tracker.md`
- `02-test-results-dashboard.md`
- `03-test-case-generator.md`
- `04-bug-report-writer.md`
- `05-qa-copilot-build-plan.md` (chosen plan: Test Case Generator + Bug Report Writer on GitHub Pages)
