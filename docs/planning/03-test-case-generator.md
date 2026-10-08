# 3. Test Case Generator (Playwright or Cypress)

> Paste a user story or requirement. Get test cases, edge cases, and starter code for Playwright or Cypress.

---

## The problem

Writing test cases from requirements is slow and repetitive, and edge cases get missed. Turning those cases into automation code takes even longer, especially on new projects.

## Who it's for

Manual testers, QA engineers, SDETs, and developers who write their own tests.

---

## How it works

1. Paste a user story, acceptance criteria, or a short feature description.
2. Choose options: **framework** (Playwright or Cypress), **language** (TypeScript or JavaScript), **test types** (happy path, negative, edge, accessibility).
3. The AI returns:
   - A table of test cases (ID, title, steps, expected result, priority)
   - Starter automation code for the chosen framework
4. Edit, copy, or export (Markdown, CSV, or `.spec.ts` / `.cy.ts` file).

---

## Features

### MVP (build first)
- Requirement input (textarea)
- Framework toggle: **Playwright / Cypress**
- Test type checkboxes: happy path, negative, edge cases, accessibility
- Output tab 1: **Test cases** table with priority badges
- Output tab 2: **Code** with syntax highlighting and copy button
- Export test cases as CSV or Markdown

### Later
- Page Object Model option
- Paste a page's HTML or URL to get better selectors (`getByRole`, `data-testid`)
- Gherkin (Given / When / Then) output
- Save history of past generations
- "Regenerate this one case" button
- Export to TestRail, Xray, or Zephyr CSV formats

---

## Screens

| Screen | What's on it |
|--------|--------------|
| **Generator** | Left: input + options. Right: output with tabs (Test cases / Code) |
| **History** | Table of past generations with search |
| **Settings** | Default framework, language, naming style |

---

## Untitled UI components to use

| Need | Component | Link |
|------|-----------|------|
| App layout | Sidebar navigation | https://www.untitledui.com/react/components/sidebar-navigations |
| Requirement input | Textareas | https://www.untitledui.com/react/components/textareas |
| Playwright / Cypress | Button groups | https://www.untitledui.com/react/components/button-groups |
| Test types | Checkboxes | https://www.untitledui.com/react/components/checkboxes |
| Language / style | Select | https://www.untitledui.com/react/components/select |
| Output switch | Tabs | https://www.untitledui.com/react/components/tabs |
| Test case list | Tables | https://www.untitledui.com/react/components/tables |
| Priority labels | Badges | https://www.untitledui.com/react/components/badges |
| Generated code | Code snippets | https://www.untitledui.com/react/components/code-snippets |
| Generating... | Loading indicators | https://www.untitledui.com/react/components/loading-indicators |
| "Copied!" | Notifications | https://www.untitledui.com/react/components/notifications |
| Settings | Toggles | https://www.untitledui.com/react/components/toggles |

---

## How the AI part works

- The app runs fully in the browser on GitHub Pages. AI runs in one of three modes: **Demo**, **Bring your own key**, or **Prompt only** (details in `05-qa-copilot-build-plan.md`).
- The prompt asks the model to return **JSON only**: a list of test cases plus a code string.
- The app validates the JSON (for example with Zod) and renders the table and code.

```ts
type TestCase = {
  id: string;            // TC-001
  title: string;
  type: 'happy' | 'negative' | 'edge' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
  steps: string[];
  expected: string;
};
```

Prompt tips that improve results:
- Ask for `getByRole` and `getByTestId` selectors (Playwright best practice)
- Ask for `cy.get('[data-cy=...]')` selectors for Cypress
- Ask it to list assumptions it made when the requirement is vague

---

## Effort and value

- **Effort:** Medium, about 2–3 weeks. Prompt tuning takes the most time.
- **Difficulty:** Medium.
- **Portfolio value:** Excellent. AI + QA depth + useful output.
- **FDE angle:** "I take vague requirements from customers and turn them into concrete, testable plans. This tool does that in seconds."

## Tip

Include 2–3 **example requirements** (login, checkout, password reset) users can click to try instantly.
