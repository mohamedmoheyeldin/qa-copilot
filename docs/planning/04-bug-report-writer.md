# 4. Bug Report Writer (any tracker, any test type)

> Paste messy notes, a stack trace, or a failed test output. Get a clean bug report formatted for your tracker.

---

## The problem

Bug reports are often unclear: missing steps, no expected vs. actual, no environment details. Devs bounce them back, and time is lost. Every team and every tracker also wants a slightly different format.

## Who it's for

Manual testers, automation engineers, developers, and support teams.

---

## How it works

1. Paste anything: rough notes, a Playwright/Cypress failure, a stack trace, or a customer complaint.
2. Choose:
   - **Source**: manual test or automation (Playwright, Cypress, Selenium, other)
   - **Tracker**: Jira, Azure DevOps, GitHub Issues, Linear, or generic
   - **Template**: default or one of your custom templates
3. The AI writes a structured report: title, summary, steps to reproduce, expected, actual, environment, severity and priority suggestion, possible cause.
4. Edit it in a rich text editor, then copy in the tracker's format (Jira markup, Markdown, etc.).

---

## Customization (the key feature)

- **Custom templates**: choose which fields appear, their order, and labels (for example, add "Test Case ID" or "Build Number")
- **Custom fields**: add your team's fields (component, sprint, customer impact)
- **Severity scale**: use your team's wording (S1–S4, Blocker / Critical / Major / Minor)
- **Tone**: concise or detailed
- **Output format**: Jira wiki markup, Markdown (GitHub, Linear, Azure DevOps), or plain text

---

## Features

### MVP (build first)
- Input textarea
- Source and tracker selectors
- Generated report with all standard fields
- Edit before copying
- Copy in Markdown or Jira format
- One custom template you can edit

### Later
- Multiple saved templates per project
- Attach a screenshot; AI describes what it shows
- Detect duplicate wording against past reports
- Direct "Create issue" through Jira or GitHub API
- Team sharing of templates

---

## Screens

| Screen | What's on it |
|--------|--------------|
| **Writer** | Left: input + selectors. Right: formatted report preview with Edit / Copy |
| **Templates** | List of templates, editor for fields and order |
| **Settings** | Severity scale, default tracker, tone |

---

## Untitled UI components to use

| Need | Component | Link |
|------|-----------|------|
| App layout | Sidebar navigation | https://www.untitledui.com/react/components/sidebar-navigations |
| Notes input | Textareas | https://www.untitledui.com/react/components/textareas |
| Source / tracker | Select | https://www.untitledui.com/react/components/select |
| Manual vs automation | Radio groups | https://www.untitledui.com/react/components/radio-groups |
| Editing the report | Rich text editors | https://www.untitledui.com/react/components/text-editors |
| Severity / priority | Badges | https://www.untitledui.com/react/components/badges |
| Custom fields | Tags | https://www.untitledui.com/react/components/tags |
| Stack traces | Code snippets | https://www.untitledui.com/react/components/code-snippets |
| Template editor | Modals | https://www.untitledui.com/react/components/modals |
| Templates list | Tables | https://www.untitledui.com/react/components/tables |
| Screenshot upload (later) | File uploaders | https://www.untitledui.com/react/components/file-uploaders |
| "Copied!" | Notifications | https://www.untitledui.com/react/components/notifications |
| Settings pages | Settings pages | https://www.untitledui.com/react/components/settings-pages |

---

## Data (simple)

```ts
type Template = {
  id: string;
  name: string;            // "Jira – Web App"
  tracker: 'jira' | 'azure' | 'github' | 'linear' | 'generic';
  fields: { key: string; label: string; required: boolean }[];
  severityScale: string[]; // ['Blocker','Critical','Major','Minor']
  tone: 'concise' | 'detailed';
};

type BugReport = {
  title: string;
  summary: string;
  steps: string[];
  expected: string;
  actual: string;
  environment: string;
  severity: string;
  priority: string;
  possibleCause?: string;
  extra: Record<string, string>;  // custom fields
};
```

---

## Effort and value

- **Effort:** Small to medium, about 1–2 weeks for MVP. Templates add another week.
- **Difficulty:** Easy to medium.
- **Portfolio value:** Excellent. Everyone has suffered bad bug reports.
- **FDE angle:** "Every customer uses a different tracker and process. I built a tool that adapts to theirs instead of forcing one format."

## Tip

The customization is what makes this stand out from a plain ChatGPT prompt. Lead with it in your demo.
