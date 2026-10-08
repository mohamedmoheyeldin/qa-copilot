# 1. Flaky Test Tracker (Playwright)

> Find tests that fail sometimes and pass other times, tag why, and track them until fixed.

---

## The problem

Flaky tests waste time and erode trust in CI. Teams rerun pipelines, ignore red builds, and nobody owns the fix. Most teams have no list of which tests are flaky or why.

## Who it's for

QA engineers, SDETs, and dev leads who own a Playwright suite.

---

## How it works

1. Upload one or more Playwright JSON reports (`npx playwright test --reporter=json`).
2. The app finds tests Playwright marked as **flaky** (failed first, passed on retry) and tests that flip between pass and fail across runs.
3. You tag each one with a cause, assign an owner, and set a status.
4. Track progress over time until the list shrinks.

---

## Features

### MVP (build first)
- Upload Playwright JSON reports (drag and drop)
- Flaky test list: test name, file, flake rate, last seen
- Tag the cause: **Timing**, **Test data**, **Environment**, **Selector**, **Network**, **Unknown**
- Status: **New → Investigating → Fixed → Ignored**
- Owner field and notes
- Filter by cause, status, owner

### Later
- Flake rate trend per test (line chart)
- "Top 10 flakiest" widget
- Show the error message and retry history per test
- Auto-detect likely cause from the error text (AI, optional)
- Pull reports straight from GitHub Actions artifacts

---

## Screens

| Screen | What's on it |
|--------|--------------|
| **Flaky list** | Metrics row (total flaky, fixed this week, avg flake rate), filter bar, table of tests |
| **Test detail** | Side drawer with history, error message, cause tag, owner, notes |
| **Upload** | File uploader with progress and a summary of what was found |

---

## Untitled UI components to use

| Need | Component | Link |
|------|-----------|------|
| App layout | Sidebar navigation | https://www.untitledui.com/react/components/sidebar-navigations |
| Page title + actions | Page headers | https://www.untitledui.com/react/components/page-headers |
| Top numbers | Metrics | https://www.untitledui.com/react/components/metrics |
| Test list | Tables | https://www.untitledui.com/react/components/tables |
| Filters | Filter bars | https://www.untitledui.com/react/components/filter-bars |
| Cause / status labels | Badges | https://www.untitledui.com/react/components/badges |
| Test detail panel | Drawers | https://www.untitledui.com/react/components/drawers |
| Upload | File uploaders | https://www.untitledui.com/react/components/file-uploaders |
| Owner / status pickers | Select | https://www.untitledui.com/react/components/select |
| Nothing uploaded yet | Empty states | https://www.untitledui.com/react/components/empty-states |
| History | Activity feeds | https://www.untitledui.com/react/components/activity-feeds |

---

## Data (simple)

```ts
type FlakyTest = {
  id: string;          // file + title
  title: string;
  file: string;
  runs: number;
  flakyRuns: number;   // passed on retry
  flakeRate: number;   // flakyRuns / runs
  lastSeen: string;
  lastError?: string;
  cause?: 'timing' | 'data' | 'environment' | 'selector' | 'network' | 'unknown';
  status: 'new' | 'investigating' | 'fixed' | 'ignored';
  owner?: string;
  notes?: string;
};
```

Playwright's JSON report already marks each test's outcome as `expected`, `unexpected`, `flaky`, or `skipped`, so detection is mostly parsing.

---

## Effort and value

- **Effort:** Small, about 1–2 weeks. Mostly parsing JSON and building one good table.
- **Difficulty:** Easy to medium.
- **Portfolio value:** Good. Very relatable to any engineering hiring manager.
- **FDE angle:** "Teams kept rerunning CI. I built a tool that showed exactly which tests were flaky and why, so we could fix them instead of ignoring them."

## Tip

This pairs perfectly with **Test Results Dashboard**. Same upload, same data, just a different view. Consider building them as one app.
