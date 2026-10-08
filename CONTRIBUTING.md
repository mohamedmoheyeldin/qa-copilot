# Contributing to QA Copilot

Thanks for helping! QA Copilot is a browser-only app, so you can run everything locally with Node and nothing else.

## Setup

```bash
npm install
npm run dev            # http://localhost:5173
```

## Before you open a pull request

```bash
npm run format         # Prettier
npm run typecheck
npm run test:unit      # Vitest: code generator, providers, exports, history, stats
npm run test:e2e       # Playwright against the production build
```

On Windows networks that block Playwright's browser download, `npm run test:e2e:edge` uses the Edge that's already installed.

## Good first contributions

- **A new framework or language.** Add it to `src/lib/frameworks.ts` and write a renderer in `src/lib/codegen/dialects.ts`. The unit tests automatically check every combination for valid syntax and matching Cucumber steps.
- **A new tracker profile.** Add defaults in `src/lib/defaults.ts`.
- **Smarter step interpretation.** `src/lib/codegen/actions.ts` turns plain-English steps into actions. Add a pattern and a test case in `codegen.test.ts`.
- **A new AI provider.** Add an adapter in `src/lib/ai/client.ts` with a mocked test in `src/lib/logic.test.ts`.

## Ground rules

- No backend. Everything runs in the browser so the app can be hosted anywhere and used where data can't leave the machine.
- Every tool must work in all three AI modes: demo, your API key, and prompt only.
- Never log, export, or send API keys anywhere except the provider the user chose.
- Keep demo data fictional.
- Build tools from the shared kit in `src/components/qa/tool/` so the app feels like one product.

`CLAUDE.md` has more detail on the architecture.
