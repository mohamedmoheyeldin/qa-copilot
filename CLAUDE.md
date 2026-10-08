# QA Copilot

AI helpers for QA work: a **Bug report writer** and a **Test case generator** in one app.
Static site on **GitHub Pages**. No backend. Built with **Untitled UI React (free, MIT)**, React 19, TypeScript, Tailwind CSS v4, and React Aria.

This is also a Forward Deployed Engineer portfolio piece. The core idea: adapt to the customer's tracker, templates, and AI rules instead of forcing ours.

## Commands

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Typecheck + production build to dist/
npm run preview      # Serve dist/ at http://localhost:4173
npm run typecheck    # tsc -b
npm run test:e2e     # Playwright tests (builds and serves dist/ first)
npm run format       # Prettier
npx untitledui@latest add <component>   # Add an Untitled UI component
```

Always run `npm run typecheck` and `npm run test:e2e` before finishing a change.

## Hard constraints

- **Static only.** GitHub Pages can't run server code. Never add API routes, server actions, or anything that needs Node at runtime.
- **HashRouter.** Routes look like `/#/settings`. Keep `HashRouter` in `src/main.tsx` and `base: "./"` in `vite.config.ts`. Links use plain paths (`href="/settings"`); `RouteProvider` converts them with `useHref`.
- **No secrets in the repo.** The only API key is the user's own, entered in Settings and kept in localStorage. Never hard-code keys, never add `.env` secrets for the frontend (Vite would bundle them into public JS).
- **Untitled UI free components only.** Don't paste PRO components into this public repo.
- **Fictional demo data.** Samples use the made-up "Acme Shop". Never add real work data, names, or internal URLs.

## AI modes (src/hooks/use-generator.ts)

| Mode | Behavior |
|------|----------|
| `demo` (default) | Returns sample results from `src/lib/demo-data.ts`. No network. |
| `byok` | Calls Anthropic or OpenAI directly from the browser (`src/lib/ai/client.ts`). Anthropic needs the `anthropic-dangerous-direct-browser-access` header. |
| `prompt` | Shows the built prompt to copy into any approved AI tool, then parses the pasted answer. |

Every tool follows the same flow: input → `redact()` → prompt builder → AI mode → `parseWith(zodSchema)` → render → format/export.
Prompts must ask for **JSON only**, and every response is validated with Zod in `src/lib/ai/parse.ts`.

## Project structure

```
src/
├── components/
│   ├── base/, application/, foundations/   # Untitled UI components (owned source, edit freely)
│   └── qa/                                 # App shell and QA Copilot components
│       └── tool/                           # Shared tool kit used by every tool page
├── hooks/use-generator.ts                  # Shared AI-mode logic for every tool
├── lib/
│   ├── types.ts                            # All shared types
│   ├── defaults.ts                         # Default settings and tracker profiles
│   ├── settings-context.tsx                # Settings in localStorage, import/export
│   ├── prompts.ts                          # Prompt builders
│   ├── redact.ts                           # Masks emails, phones, IPs, URLs, tokens, IDs
│   ├── ai/                                 # API client + JSON parsing/validation
│   ├── formatters/                         # Jira wiki, Markdown, rich text, CSV, Gherkin
│   └── demo-data.ts                        # Samples for demo mode and tests
├── pages/                                  # One file per route
tests/e2e/                                  # Playwright specs
docs/planning/                              # Product plans
docs/untitled-ui/component-guide.md         # Untitled UI conventions and component reference
```

## Adding a new tool

1. Add types to `src/lib/types.ts` and a Zod schema to `src/lib/ai/parse.ts`.
2. Add a prompt builder to `src/lib/prompts.ts` (JSON-only output).
3. Add demo data to `src/lib/demo-data.ts`.
4. Add the tool to `src/lib/history.ts` (a new `HistoryEntry` variant) and call `history.add` from the `onResult` option of `useGenerator`. Reopen entries with `useHistoryEntry`.
5. Create `src/pages/<tool>.tsx` with the shared tool kit in `src/components/qa/tool/`: `ToolLayout` (page frame), `SamplePicker`, `GenerateBar`, `ToolOutput` (prompt-only flow, errors, empty state), plus `ModeNotice` and `useGenerator`. Every tool must use these so the app feels like one product.
6. Add the route in `src/main.tsx` and the nav item in `src/components/qa/app-shell.tsx`.
7. Add a Playwright spec in `tests/e2e/` covering demo mode.

## Code conventions

- Follow the Untitled UI conventions in `docs/untitled-ui/component-guide.md`: kebab-case file names, `Aria*` prefix for `react-aria-components` imports, semantic color classes (`text-primary`, `bg-secondary`, `ring-secondary`), icons from `@untitledui/icons`.
- Reuse existing Untitled UI components before writing new UI.
- UI copy: sentence case, plain verbs, no exclamation marks, buttons say what they do.
- Tests: prefer `getByRole` and `getByLabel`; use `data-testid` only for elements without an accessible name.

## Phase 2 conventions

- **History** (`src/lib/history.ts`): store only the input as sent to the AI (`sentInput` from `onResult`), never the raw input. Keep entries in sync when the user edits a result.
- **Errors**: throw `AiError(message, retryable)` from the AI client. Messages must say what to do next. `retryable: false` for problems a retry can't fix (bad key, unknown model, truncated output).
- **Honest output**: any result tied to options (framework, language) records what it was generated for and warns when the options or the result drift.
- **Tests**: new tools need a demo-mode spec, a mocked "Your API key" spec (`page.route`), and an entry in `tests/e2e/accessibility.spec.ts`.

## v1.0 architecture notes

- **Frameworks** (`src/lib/frameworks.ts`) is the single source of truth for frameworks, languages, and runners. The UI, prompts, and code generator all read from it.
- **Code generator** (`src/lib/codegen/`): `actions.ts` turns steps into actions, `dialects.ts` renders them per framework and language (spec and BDD), `index.ts` builds the feature file and step definitions from the same step list. Add a dialect, and `codegen.test.ts` checks it automatically.
- **Results store files, not one code string** (`TestGenResult.files`). `normalizeTestResult` and `normalizeEntry` upgrade older data.
- **Demo results** rebuild code live from the cases. AI results keep their code and offer "Update code with AI" (`buildCodePrompt`, cases unchanged) or offline conversion (`scaffold`).
- **Providers** live in `src/lib/ai/client.ts`. Each needs `callAi` support, `listModels`, error mapping, and a mocked unit test.
- **Exports** (`src/lib/export/`) render one `ExportDoc` to PDF, Word, Excel, and Markdown. Libraries load lazily.
- **Chart colors** used as CSS variables must be listed in the `@source inline` line in `src/styles/globals.css`, or Tailwind drops them.
