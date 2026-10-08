Add a new tool to QA Copilot: $ARGUMENTS

Follow "Adding a new tool" in CLAUDE.md exactly. Requirements:

- Works in all three AI modes (demo, byok, prompt) through `useGenerator`.
- Prompt asks for JSON only; validate with a Zod schema.
- Uses existing Untitled UI components and matches the layout of `src/pages/bug-report-writer.tsx`.
- Fictional demo data only.
- Add a Playwright spec for demo mode, then run `npm run typecheck` and `npm run test:e2e`.

Start by proposing the types, prompt shape, and screens, and wait for my OK before writing code.
