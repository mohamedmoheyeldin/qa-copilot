# QA Copilot: Build Plan

> One app, two tools: **Test Case Generator** and **Bug Report Writer**.
> Hosted on GitHub Pages. Fully customizable. Usable at work and as an FDE portfolio piece.

---

## 1. Why one app

Both tools follow the same flow: **paste input → choose options → AI returns structured output → edit → copy or export**.
They also share the same customization (project profile, templates, field names, export formats). Building them together means one setup, one settings system, and one strong portfolio link.

```
QA Copilot
├── Test Case Generator
├── Bug Report Writer
├── Templates        (shared)
└── Settings         (AI mode, project profile, import/export)
```

---

## 2. GitHub Pages: what changes

GitHub Pages only hosts **static files**. There is no server, so:

| Normal web app | On GitHub Pages |
|----------------|-----------------|
| Server keeps the API key secret | No server, so the key can't be hidden in the app |
| Database stores templates | Templates live in the browser (localStorage / IndexedDB) |
| Next.js server routes | Vite + React static build |
| Clean URLs like `/bugs` | Use `HashRouter` (`/#/bugs`) so page refreshes don't 404 |

### AI modes (pick in Settings)

| Mode | How it works | Best for |
|------|--------------|----------|
| **Demo** | Built-in sample inputs and outputs. No key, no network calls. | Recruiters and hiring managers trying the app |
| **Bring your own key** | User pastes their own OpenAI or Anthropic key. It's stored only in their browser and the app calls the AI provider directly. | Personal use, power users |
| **Prompt only** | The app builds the full prompt from your template and settings. You copy it into whatever AI tool your organization approves, then paste the JSON answer back. The app formats it. | **Work use** when only approved AI tools are allowed |
| **Local model** (later) | Calls a local model such as Ollama on `localhost`. Data never leaves the machine. | Sensitive data, if installing local tools is allowed |

Demo mode should be the default, so the live site works for anyone with zero setup.

> **Why "Prompt only" matters:** it makes the tool usable in places with strict AI rules. That's a very FDE way of thinking: adapt to the customer's constraints instead of forcing yours.

### Optional later: Cloudflare Worker proxy
If you want a live AI demo without visitors needing a key, add a tiny Cloudflare Worker (free tier) that holds your key and rate-limits requests. GitHub Pages stays the frontend.

---

## 3. Using it at work (read this first)

Before using either tool with real work data:

- **Check your organization's AI policy.** Many government and enterprise environments only allow approved AI tools. Prompt-only mode is designed for this.
- **Never paste** personal or sensitive data (names, SSNs, health information, record IDs), credentials, tokens, internal URLs, or anything marked sensitive into a non-approved tool.
- **Add a redaction step** (built-in feature, see below) that masks emails, phone numbers, IPs, URLs, and long ID numbers before anything is sent.
- Keep the public demo data fictional (a made-up "Acme Shop" app).

---

## 4. Shared customization (both tools)

Everything is configurable, saved in the browser, and exportable as a JSON file you can share with your team.

### Project profile
| Setting | Example |
|---------|---------|
| Project name | Acme Shop |
| Project key / ID prefix | `SHOP` → bugs `SHOP-BUG-001`, tests `SHOP-TC-001` |
| Environments | dev, staging, prod |
| Browsers / devices | Chrome, Safari 17, iPhone 15 |
| App areas / components | Login, Cart, Checkout, Profile |
| Custom AI instructions | "Use plain English. Our users are veterans; flag accessibility issues." |

### Templates
- Create, edit, duplicate, delete
- Choose fields, order, labels, and which are required
- Add custom fields (text, dropdown, tags)
- Set one template as default per tool

### Import / export
- **Export settings** → `qa-copilot-settings.json` (share with teammates)
- **Import settings** → teammate gets the exact same templates and rules
- Sample team profiles included (e.g., "Jira Cloud web team", "Azure DevOps team")

### Redaction
- Toggle on/off
- Built-in rules: emails, phone numbers, IP addresses, URLs, long numbers
- Custom rules: add your own words or patterns (e.g., internal hostnames)
- Shows a preview of what was masked before sending

### Prompt preview
A "View prompt" button shows exactly what will be sent to the AI. Builds trust and makes debugging easy.

---

## 5. Bug Report Writer: tracker support

The trick to supporting **Jira and any other tool**: one structured report, many output formats.

```
Your notes ──► AI ──► Structured report (JSON) ──► Formatter ──► Jira / Azure DevOps / GitHub / Linear / any tool
```

### Output formats

| Format | Works with |
|--------|------------|
| **Rich text (copy as formatted)** | Jira Cloud, Azure DevOps, Confluence, ServiceNow, most modern editors. Paste and the formatting stays. |
| **Jira wiki markup** | Jira Data Center / Server and older Jira editors |
| **Markdown** | GitHub Issues, GitLab, Linear, Azure DevOps (Markdown fields), Notion |
| **Plain text** | Anything else, email, chat |
| **CSV** | Bulk import into Jira (CSV importer) or other trackers |

Jira is the main example in the demo, but no tracker is hard-coded. A **tracker profile** defines the output:

### Tracker profile (customizable)
| Setting | Jira example | Azure DevOps example |
|---------|--------------|----------------------|
| Output format | Rich text | Rich text |
| Severity scale | Blocker, Critical, Major, Minor, Trivial | 1 - Critical, 2 - High, 3 - Medium, 4 - Low |
| Priority scale | Highest, High, Medium, Low, Lowest | 1, 2, 3, 4 |
| Field labels | Steps to Reproduce, Expected Result | Repro Steps, Expected |
| Title pattern | `[Area] Short problem` | `Area: Short problem` |
| Extra fields | Component, Fix Version, Labels | Area Path, Iteration |

### Input sources
- Manual testing notes
- Playwright, Cypress, or Selenium failure output (error message, stack trace)
- Customer or support complaint text
- Screenshot description (later: image upload)

### Bug report customization
- Tone: concise or detailed
- Include "possible cause" section: on/off
- Include "suggested test to prevent regression": on/off (links nicely to the Test Case Generator)
- Steps format: numbered list or Given / When / Then

### Later (needs a proxy)
Direct "Create issue in Jira" button. Browsers block direct calls to the Jira API from another website (CORS), so this needs the Cloudflare Worker from section 2. Copy and CSV cover most needs without it.

---

## 6. Test Case Generator: customization

| Setting | Options |
|---------|---------|
| Framework | Playwright, Cypress |
| Language | TypeScript, JavaScript |
| Selector strategy | Role-based (`getByRole`), test ID attribute |
| Test ID attribute name | `data-testid`, `data-cy`, `data-qa`, or your own |
| Page Object Model | On/off, base class name, folder name |
| Test naming | `should ...`, `TC-001: ...`, or custom pattern |
| Tags | `@smoke`, `@regression`, custom tags |
| Test types | Happy path, negative, edge cases, accessibility, API |
| Number of cases | 3–20 |
| Case fields | ID, title, preconditions, steps, expected, priority, type, plus custom |
| Output | Table, Gherkin, code, CSV |
| CSV column mapping | Map fields to your test management tool's columns (Xray, Zephyr, TestRail, Azure Test Plans) |
| Style sample | Paste one of your real tests; the AI matches its style |

The **style sample** is the standout feature: generated code looks like your team wrote it.

---

## 7. Tech stack

| Layer | Choice |
|-------|--------|
| Build | Vite + React + TypeScript |
| UI | Untitled UI React (free, MIT) |
| Styling | Tailwind CSS v4 |
| Routing | React Router with `HashRouter` |
| Forms / validation | React Hook Form + Zod |
| Storage | localStorage (settings) + IndexedDB (history) |
| AI calls | Direct `fetch` to OpenAI or Anthropic from the browser (BYOK mode) |
| Testing | Playwright tests for the app itself, run in CI |
| Deploy | GitHub Actions → GitHub Pages |

GitHub Pages setup notes:
- Set `base: '/qa-copilot/'` in `vite.config.ts` (matches the repo name)
- Add a GitHub Actions workflow: install → run Playwright tests → build → deploy
- Tests must pass before deploy. Great talking point for a QA-to-FDE story.

---

## 8. Untitled UI: Free or PRO?

**Recommendation: start with Free.**

- The free set is MIT licensed and covers what these tools need: inputs, textareas, selects, buttons, button groups, checkboxes, toggles, badges, tags, tabs, tables, modals, and more.
- Your repo must be **public** for GitHub Pages on a free GitHub account. With the free set, that's no problem, and recruiters can read your code.
- PRO is a separate paid license. Before putting any PRO component code in a public repo, read the license agreement carefully, because commercial UI kits often restrict redistributing their source.
- Revisit PRO later only if you want ready-made polished page layouts and are happy with the license terms.

---

## 9. Build order (MVP first)

| Phase | Scope | Time |
|-------|-------|------|
| 1. Setup | Vite + Tailwind + Untitled UI, layout, sidebar, GitHub Pages deploy working | 2–3 days |
| 2. Settings | Project profile, AI mode, API key, redaction, export/import JSON | 3–4 days |
| 3. Bug Report Writer | Input, generation, preview, edit, copy as rich text / Jira / Markdown | 4–5 days |
| 4. Templates | Template editor shared by both tools, tracker profiles | 3–4 days |
| 5. Test Case Generator | Input, options, table, code tab, CSV export | 5–6 days |
| 6. Demo polish | Demo mode samples, README with GIF, Playwright tests in CI | 2–3 days |

About **4–5 weeks** of evenings and weekends.

Starting with the Bug Report Writer is a good move: it's simpler, and you can use it at work sooner.

---

## 10. FDE story

> "Every team I've worked with uses a different tracker, different templates, and different AI rules. So I built QA Copilot to adapt to the customer instead of the other way around: custom templates, any tracker, and a prompt-only mode for environments where only approved AI tools are allowed. It runs as a static site with no backend, so there's nothing to approve or host."
