Review the current changes (`git diff`) as a senior engineer and QA lead.

Check for:

- Anything that breaks the static GitHub Pages constraints in CLAUDE.md (server code, BrowserRouter, absolute asset paths).
- Secrets, real work data, or internal URLs in code, samples, or tests.
- Missing redaction, missing Zod validation, or prompts that don't ask for JSON only.
- Accessibility problems (labels, keyboard use, focus, contrast).
- Missing or weak Playwright coverage.

List issues by severity, then suggest fixes.
