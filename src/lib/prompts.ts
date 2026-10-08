import { expectedLayout } from "./codegen";
import { describeTarget, runnerFor } from "./frameworks";
import type { BugSource, CodeTarget, Settings, TestCase, TrackerProfile } from "./types";

export interface Prompt {
    system: string;
    user: string;
}

const list = (items: string[]) => (items.length ? items.join(", ") : "not specified");

const projectContext = (s: Settings) =>
    [
        `Project: ${s.project.name}`,
        `Environments: ${list(s.project.environments)}`,
        `Browsers/devices: ${list(s.project.browsers)}`,
        `App areas: ${list(s.project.areas)}`,
        s.project.instructions ? `Team instructions: ${s.project.instructions}` : "",
    ]
        .filter(Boolean)
        .join("\n");

export const buildBugPrompt = (input: string, source: BugSource, tracker: TrackerProfile, s: Settings): Prompt => {
    const custom = tracker.customFields.length ? `"customFields": { ${tracker.customFields.map((f) => `"${f}": "string"`).join(", ")} },` : "";

    const system = [
        "You are a senior QA engineer who writes clear, actionable bug reports that developers can act on immediately.",
        "Respond with a single JSON object only. No markdown fences, no commentary.",
        'Never invent facts that aren\'t supported by the input. If something is unknown, write "Not provided".',
        `Tone: ${s.bug.tone === "concise" ? "concise, short sentences" : "detailed, but still scannable"}.`,
    ].join("\n");

    const user = `${projectContext(s)}

Tracker: ${tracker.name}
Title pattern: ${tracker.titlePattern} (fill {area} from the app areas when possible, {problem} is a short description)
Severity must be one of: ${tracker.severityScale.join(" | ")}
Priority must be one of: ${tracker.priorityScale.join(" | ")}
Input source: ${source}

Return JSON with this exact shape:
{
  "title": "string",
  "summary": "one or two sentences",
  "steps": ["step 1", "step 2"],
  "expected": "string",
  "actual": "string",
  "environment": "string",
  "severity": "string",
  "priority": "string",
  ${s.bug.includePossibleCause ? `"possibleCause": "short hypothesis, clearly marked as a guess",` : ""}
  ${s.bug.includeRegressionTest ? `"regressionTest": "one sentence describing an automated test that would catch this",` : ""}
  ${custom}
}

Input:
"""
${input}
"""`;

    return { system, user };
};

const selectorRule = (s: Settings) => {
    const t = s.testGen;
    if (t.selectorStrategy === "test-id") return `Locate elements by the "${t.testIdAttribute}" attribute.`;
    return {
        playwright: "Prefer role, label, and text locators (getByRole/getByLabel/getByText or the language's equivalent). Fall back to test IDs.",
        cypress: "Prefer cy.contains and accessible attributes. Fall back to the test ID attribute.",
        selenium: "Prefer locators based on visible text, labels, and ARIA roles (XPath or CSS). Avoid brittle absolute XPaths.",
        webdriverio: "Prefer accessible-name selectors (aria/Name) and visible text. Fall back to test IDs.",
    }[t.framework];
};

/** Code requirements shared by full generation and code-only conversion, so both produce the same layout. */
const codeRequirements = (s: Settings, suiteName: string) => {
    const t = s.testGen;
    const target: CodeTarget = { framework: t.framework, language: t.language, bdd: t.bdd };
    const layout = expectedLayout(target, suiteName);
    return `Code requirements:
- Target: ${describeTarget(target)} (runner: ${runnerFor(target)})
${
    t.bdd
        ? `- BDD: write a Gherkin feature file with one Scenario per test case, step definitions that match every step text exactly, and the support/hook files needed to run it.
- Write steps in natural Gherkin ("When I click Submit"), reuse identical steps across scenarios, and define each step once.`
        : "- Write one spec file covering every test case."
}
- Use this file layout: ${layout.join(", ")}
- Selectors: ${selectorRule(s)}
- Page Object Model: ${t.pageObjects ? "yes, add page object files next to the tests" : "no"}
- Test naming pattern: ${t.namingPattern}
- Tags: ${t.tags.length ? t.tags.join(" ") : "none"}
- Read the base URL from a BASE_URL environment variable, defaulting to http://localhost:3000.
- Where a step can't be automated from the requirement alone, write a clear TODO comment instead of inventing selectors.
${t.styleSample ? `- Match the style of this example from the team's codebase:\n"""\n${t.styleSample}\n"""` : ""}`;
};

const filesShape = `"files": [{ "path": "relative/path/to/file", "content": "full file content" }]`;

export const buildTestGenPrompt = (input: string, s: Settings, suiteName = "Generated tests"): Prompt => {
    const t = s.testGen;
    const system = [
        "You are a senior SDET who designs thorough, practical test cases and writes clean, idiomatic automation code.",
        "Respond with a single JSON object only. No markdown fences, no commentary.",
        "Keep steps short and concrete. Don't invent features the requirement doesn't mention; list assumptions instead.",
    ].join("\n");

    const user = `${projectContext(s)}

Write ${t.caseCount} test cases covering these types: ${t.testTypes.join(", ")}.
Test case IDs use the prefix "${s.project.keyPrefix}-TC-" (e.g. ${s.project.keyPrefix}-TC-001).
Then write automation code for all of them. Name the suite "${suiteName}".

${codeRequirements(s, suiteName)}

Return JSON with this exact shape:
{
  "assumptions": ["string"],
  "cases": [
    { "id": "string", "title": "string", "type": "happy|negative|edge|accessibility|api", "priority": "high|medium|low", "preconditions": "string", "steps": ["string"], "expected": "string" }
  ],
  ${filesShape}
}

Requirement:
"""
${input}
"""`;

    return { system, user };
};

/** Rewrites code for existing (possibly edited) test cases in a new framework or language, without touching the cases. */
export const buildCodePrompt = (cases: TestCase[], s: Settings, suiteName: string): Prompt => ({
    system: [
        "You are a senior SDET who writes clean, idiomatic automation code.",
        "Respond with a single JSON object only. No markdown fences, no commentary.",
        "Implement exactly the test cases given. Don't add, remove, or rename cases.",
    ].join("\n"),
    user: `${projectContext(s)}

Write automation code for these test cases. Name the suite "${suiteName}".

${codeRequirements(s, suiteName)}

Return JSON with this exact shape:
{
  ${filesShape}
}

Test cases:
${JSON.stringify(cases, null, 2)}`,
});

/** Single block of text for prompt-only mode, ready to paste into any AI tool. */
export const toPasteablePrompt = (p: Prompt) => `${p.system}\n\n${p.user}`;
