# Security

QA Copilot runs entirely in the browser. API keys are stored in the browser's local storage and sent only to the AI provider the user selects. They are never included in exported settings or history.

## Reporting a vulnerability

Please report security issues privately through [GitHub security advisories](https://github.com/mohamedmoheyeldin/qa-copilot/security/advisories/new) rather than a public issue. I'll respond as soon as I can.

## Using QA Copilot with sensitive data

- Follow your organization's AI policy. Prompt-only mode lets you use an approved AI tool instead of a direct API call.
- Keep redaction on. It masks emails, phone numbers, SSNs, IP addresses, URLs, tokens, long IDs, and your own custom terms, but it can't catch everything.
- Don't store a work API key in a shared browser profile.
