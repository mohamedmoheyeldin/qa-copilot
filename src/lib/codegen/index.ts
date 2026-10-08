import { describeTarget, normalizeTarget, runnerFor } from "../frameworks";
import type { CodeTarget, GeneratedFile, TestCase } from "../types";
import { type StepState, slug, toAction, toAssertion } from "./actions";
import { type Dialect, type Feature, type SelectorPrefs, type Spec, type StepDef, dialects, pascal } from "./dialects";

export interface ScaffoldOptions {
    /** Suite / feature name, e.g. "Password reset". */
    name: string;
    tags: string[];
    selectors: SelectorPrefs;
}

const dialectFor = (t: CodeTarget): Dialect => dialects[`${t.framework}:${t.language}` as keyof typeof dialects];

const imperative =
    /^(open|click|enter|submit|confirm|go|navigate|visit|type|select|press|tap|fill|apply|add|remove|log|sign|upload|choose|check|uncheck|wait|refresh|reload|scroll|use|try|request|set|update|delete|search|view|close|cancel|save|send|attempt|change|reset|create|edit|leave|return|switch|toggle|drag|hover|accept|decline|complete|start|stop|pay|place|redeem|enable|disable)\b/i;

/**
 * Turns a test step into natural Gherkin: "Click Forgot password" becomes "I click Forgot password",
 * "A registered user exists" becomes "a registered user exists". The feature file and step definitions
 * both use this, so their text always matches exactly.
 */
export const gherkinText = (text: string) => {
    const t = text.trim().replace(/\.$/, "");
    const lowerFirst = /^[A-Z](?![A-Z])/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
    return imperative.test(t) ? `I ${lowerFirst}` : lowerFirst;
};

/** Gherkin built from the cases. Step definitions are generated from the same list, so they always match. */
export const buildFeature = (cases: TestCase[], name: string, tags: string[]) => {
    const steps = new Map<string, StepDef>();
    const add = (keyword: StepDef["keyword"], raw: string, action: () => StepDef["action"]) => {
        const text = gherkinText(raw);
        if (!steps.has(text)) steps.set(text, { keyword, text, action: action() });
        return text;
    };

    const scenarios = cases.map((c) => {
        const state: StepState = {};
        const lines: string[] = [];
        const caseTags = [...tags, `@${c.id}`, `@${c.priority}`, `@${c.type}`].map((t) => (t.startsWith("@") ? t : `@${t}`)).map((t) => t.replace(/\s+/g, "-"));
        lines.push(`  ${caseTags.join(" ")}`, `  Scenario: ${c.title}`);
        if (c.preconditions) {
            lines.push(`    Given ${add("Given", c.preconditions, () => ({ kind: "todo", text: `set up: ${c.preconditions}` }))}`);
        }
        c.steps.filter(Boolean).forEach((step, i) => {
            const keyword = i === 0 ? "When" : "And";
            lines.push(`    ${keyword} ${add("When", step, () => toAction(step, state))}`);
        });
        lines.push(`    Then ${add("Then", c.expected, () => toAssertion(c.expected))}`);
        return lines.join("\n");
    });

    const gherkin = [`Feature: ${name}`, "", ...scenarios.flatMap((s) => [s, ""])].join("\n");
    return { gherkin, steps: [...steps.values()] };
};

const buildSpec = (cases: TestCase[], name: string, tags: string[]): Spec => ({
    name,
    slug: slug(name),
    pascal: pascal(name),
    tests: cases.map((c) => {
        const state: StepState = {};
        return {
            id: c.id,
            title: c.title,
            tags,
            preconditions: c.preconditions,
            steps: c.steps.filter(Boolean).map((text) => ({ text, action: toAction(text, state) })),
            expected: { text: c.expected, action: toAssertion(c.expected) },
        };
    }),
});

const readme = (t: CodeTarget, d: Dialect, files: GeneratedFile[], selectors: SelectorPrefs): GeneratedFile => ({
    path: "README.md",
    content: [
        `# Generated tests: ${describeTarget(t)}`,
        "",
        `Runner: ${runnerFor(t)}`,
        "",
        "## Files",
        "",
        ...files.map((f) => `- \`${f.path}\``),
        "",
        "## Setup",
        "",
        "```bash",
        t.bdd ? d.setup.bddInstall : d.setup.install,
        "```",
        "",
        "## Run",
        "",
        "```bash",
        t.bdd ? d.setup.bddRun : d.setup.run,
        "```",
        "",
        "Set `BASE_URL` to the app under test (defaults to http://localhost:3000).",
        selectors.strategy === "test-id" && selectors.testIdAttribute !== "data-testid" && t.framework === "playwright"
            ? `\nSelectors use \`${selectors.testIdAttribute}\`. Set \`testIdAttribute: "${selectors.testIdAttribute}"\` in your Playwright config.`
            : "",
        "",
        "Steps the generator couldn't map to an action are marked `TODO`. Replace them with your app's real selectors and flows.",
        "",
    ].join("\n"),
});

/**
 * Builds runnable starter code for any supported framework, language, and BDD combination,
 * entirely offline. Demo mode uses this, and AI modes offer it as an instant conversion.
 */
export const scaffold = (cases: TestCase[], target: CodeTarget, opts: ScaffoldOptions): GeneratedFile[] => {
    const t = normalizeTarget(target);
    const d = dialectFor(t);
    const name = opts.name.trim() || "Generated tests";
    let files: GeneratedFile[];
    if (t.bdd) {
        const { gherkin, steps } = buildFeature(cases, name, opts.tags);
        const feature: Feature = { name, slug: slug(name), pascal: pascal(name), gherkin, steps };
        files = d.bdd(feature, opts.selectors);
    } else {
        files = d.spec(buildSpec(cases, name, opts.tags), opts.selectors);
    }
    return [...files.map((f) => ({ ...f, content: tidy(f.content) })), readme(t, d, files, opts.selectors)];
};

/** Collapses the blank lines the templates leave behind, so output reads like hand-written code. */
const tidy = (code: string) =>
    code
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n\n(\s*[}\]])/g, "\n$1")
        .replace(/([{(]\n)\n/g, "$1")
        .trimEnd() + "\n";

/** The file layout a target uses, given to the AI so its output matches what the offline generator produces. */
export const expectedLayout = (target: CodeTarget, name: string) =>
    scaffold([{ id: "X-1", title: "example", type: "happy", priority: "medium", steps: ["Open the home page"], expected: "Done" }], target, {
        name,
        tags: [],
        selectors: { strategy: "role", testIdAttribute: "data-testid" },
    })
        .map((f) => f.path)
        .filter((p) => p !== "README.md");

/** Language label for syntax display and file icons. */
export const fileLanguage = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    return (
        (
            { ts: "TypeScript", js: "JavaScript", py: "Python", java: "Java", cs: "C#", feature: "Gherkin", md: "Markdown", json: "JSON" } as Record<
                string,
                string
            >
        )[ext ?? ""] ?? "Text"
    );
};
