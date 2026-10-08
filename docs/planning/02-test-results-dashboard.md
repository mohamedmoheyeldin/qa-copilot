# 2. Test Results Dashboard (Playwright)

> Upload Playwright reports and see pass rates, trends, slow tests, and failures in one clean dashboard.

---

## The problem

Playwright's HTML report is great for one run, but it doesn't answer questions across runs: Is the suite getting healthier? Which tests are slowest? Which area breaks most? Managers want a simple picture, not a raw report.

## Who it's for

QA leads, SDETs, dev managers, and stakeholders who want a quick health check.

---

## How it works

1. Upload Playwright JSON reports (or later, pull from CI automatically).
2. Each upload becomes a **run** with a date, branch, and environment.
3. The dashboard shows totals, trends over time, and drill-downs into failures.

---

## Features

### MVP (build first)
- Upload JSON reports; each one becomes a run
- Metrics cards: **pass rate, total tests, failed, flaky, duration**
- Pass rate trend (line chart across runs)
- Result breakdown (pie chart: passed / failed / flaky / skipped)
- Runs table: date, branch, environment, pass rate, duration
- Run detail: list of failed tests with error messages

### Later
- Slowest 10 tests (bar chart)
- Filter by browser project (Chromium, Firefox, WebKit), branch, or tag
- Compare two runs side by side ("what broke since yesterday?")
- Pull results from GitHub Actions automatically
- Short AI summary of a run ("3 new failures, all in checkout, likely same root cause")

---

## Screens

| Screen | What's on it |
|--------|--------------|
| **Overview** | 4 metric cards, pass rate line chart, result pie chart, recent runs table |
| **Run detail** | Run header, tabs (Failed / Flaky / All), test table, error drawer |
| **Upload** | File uploader with fields for branch and environment |

---

## Untitled UI components to use

| Need | Component | Link |
|------|-----------|------|
| App layout | Sidebar navigation | https://www.untitledui.com/react/components/sidebar-navigations |
| Page title + date range | Page headers | https://www.untitledui.com/react/components/page-headers |
| KPI cards | Metrics | https://www.untitledui.com/react/components/metrics |
| Pass rate trend, slow tests | Line & bar charts | https://www.untitledui.com/react/components/line-bar-charts |
| Result breakdown | Pie charts | https://www.untitledui.com/react/components/pie-charts |
| Pass rate gauge | Activity gauges | https://www.untitledui.com/react/components/activity-gauges |
| Runs / tests list | Tables | https://www.untitledui.com/react/components/tables |
| Failed / Flaky / All | Tabs | https://www.untitledui.com/react/components/tabs |
| Date range | Date pickers | https://www.untitledui.com/react/components/date-pickers |
| Error details | Drawers | https://www.untitledui.com/react/components/drawers |
| Stack traces | Code snippets | https://www.untitledui.com/react/components/code-snippets |
| Upload | File uploaders | https://www.untitledui.com/react/components/file-uploaders |
| Layout inspiration | Dashboards 01 / 02 | https://www.untitledui.com/react/components/dashboards |

---

## Data (simple)

```ts
type Run = {
  id: string;
  date: string;
  branch?: string;
  environment?: string;   // dev, staging, prod
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  durationMs: number;
  tests: TestResult[];
};

type TestResult = {
  title: string;
  file: string;
  project: string;        // chromium, firefox, webkit
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
  durationMs: number;
  error?: string;
};
```

---

## Effort and value

- **Effort:** Medium, about 2–3 weeks. Charts and multiple screens take more time.
- **Difficulty:** Medium.
- **Portfolio value:** Very good. Dashboards look impressive in screenshots and live demos.
- **FDE angle:** "Stakeholders couldn't tell if quality was improving. I built a dashboard that turned raw test output into a clear health picture they checked every morning."

## Tip

Add a **"Load sample data"** button so recruiters can try it without their own reports. This matters a lot for portfolio demos.
