# Case study: QA Copilot

## The problem

QA teams lose hours every week to two kinds of writing: turning rough notes and failed test runs into bug reports someone else can act on, and turning user stories into test cases and automation. AI is good at both, but most AI tools assume three things that are rarely true inside a real organization:

1. **Everyone uses the same tracker.** In practice it's Jira Cloud on one team, Jira Data Center on another, Azure DevOps somewhere else, and each one has its own severity scale, required fields, and title conventions.
2. **You can use any AI tool.** Regulated and government environments often allow only specific, approved AI tools, and some allow none that can be called from custom software.
3. **The data is safe to send.** Real bug notes contain emails, account numbers, IP addresses, internal URLs, and tokens.

A tool that ignores those constraints gets a good demo and no adoption. I've worked as a QA engineer and SDET for over 11 years, most recently in a federal environment, and every one of those constraints has blocked a promising tool on a team I worked with.

## The approach

I treated it like a forward-deployed engagement: start from the customer's constraints, then build the product that fits inside them.

**Meet the AI policy where it is.** QA Copilot has three AI modes. Demo mode shows sample results so anyone can evaluate it with no setup. "Your API key" mode calls Claude or OpenAI straight from the browser. Prompt-only mode builds the full prompt, the user runs it in whatever AI tool their organization approved, and pastes the answer back for validation and formatting. That last mode is the difference between "not allowed here" and "usable today."

**Adapt to the tracker instead of the reverse.** The AI produces one structured report. Formatters turn it into rich text for Jira Cloud and Azure DevOps, Jira wiki markup for Data Center, Markdown for GitHub and GitLab, plain text, and CSV for bulk import. Severity and priority scales, field labels, title patterns, and custom fields are all configurable, and a team can share its setup as one JSON file.

**Protect data by default.** Sensitive values are masked before a prompt is built, custom terms (project code names, customer names) can be added, and history stores only the masked input. The app has no backend, so nothing is stored on a server.

**Speak every team's automation language.** Teams don't share a framework either. The test case generator targets Playwright, Cypress, Selenium, and WebdriverIO across TypeScript, JavaScript, Python, Java, and C#, with Cucumber BDD for each. An offline code generator builds runnable starter code for all 28 combinations, so a demo works with no AI at all and switching frameworks after generating takes no time.

**Close the loop between bugs and tests.** A finished bug report hands its details to the test case generator, so the same flow that documents a bug produces the regression test that keeps it fixed.

## Decisions worth explaining

- **No server, on purpose.** GitHub Pages hosting means zero infrastructure for a team to approve. The tradeoff is that API keys live in the browser, which is why prompt-only mode exists and why the key is never included in exported settings.
- **Validate everything the AI returns.** Every response passes a Zod schema before it reaches the screen. A reply that was cut off, malformed, or missing fields gets a specific message instead of a broken page.
- **Never let the output lie.** Generated code is labeled with the framework it was written for. With an AI result, changing the framework or editing the cases flags the code as out of date and offers an AI update that keeps the cases, or an instant offline conversion.
- **Ask the provider, don't guess.** Which models a key can use depends on the account, so Settings loads the list from the provider instead of shipping one that goes stale.
- **One tool kit for every tool.** Both tools are built from the same layout, input, generate, and output components, so adding a third tool means writing the prompt and the result view, not a new app.

## How it's tested

- 63 Vitest unit tests check every framework, language, and BDD combination for valid syntax and matching Cucumber steps, plus providers, exports, and history.
- 40 Playwright end-to-end tests run in CI before every deploy.
- "Your API key" mode is tested by intercepting the provider call, covering success, rejected keys, outages with retry, and truncated replies, so CI never needs a real key.
- Every page is scanned with axe-core against WCAG 2.1 AA in light and dark mode.

## What's next

- Template editor for test case fields and CSV column mapping for Xray, Zephyr, and TestRail.
- Screenshot input for bug reports.
- An optional small proxy so teams that allow it can create Jira issues directly.
- A flaky test tracker and a results dashboard built on Playwright's JSON reports.
