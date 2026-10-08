import { describeTarget, runnerFor } from "../frameworks";
import type { BugReport, CodeTarget, GeneratedFile, TestCase, TrackerProfile } from "../types";

/**
 * A format-neutral document. Each tool describes its result once as an ExportDoc,
 * and every exporter (PDF, Word, Excel, Markdown) renders that same structure.
 */
export type Block =
    | { kind: "heading"; text: string }
    | { kind: "paragraph"; text: string }
    | { kind: "list"; items: string[]; ordered?: boolean }
    | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[] }
    | { kind: "code"; title: string; text: string };

export interface ExportDoc {
    /** Base file name without extension. */
    fileName: string;
    title: string;
    meta: [string, string][];
    blocks: Block[];
    /** Optional flat table for spreadsheets (one row per record). Defaults to the first table block. */
    sheet?: { name: string; columns: string[]; rows: string[][]; widths?: number[] };
}

const fileSafe = (s: string) =>
    s
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 60) || "export";

export const bugToDoc = (r: BugReport, tracker: TrackerProfile): ExportDoc => {
    const l = tracker.labels;
    const custom = Object.entries(r.customFields ?? {}).filter(([, v]) => v);
    const fields: [string, string][] = [["Title", r.title], [l.severity, r.severity], [l.priority, r.priority], [l.environment, r.environment], ...custom];
    return {
        fileName: `bug-${fileSafe(r.title)}`,
        title: r.title,
        meta: [[l.severity, r.severity], [l.priority, r.priority], [l.environment, r.environment], ...custom],
        blocks: [
            { kind: "heading", text: l.summary },
            { kind: "paragraph", text: r.summary },
            { kind: "heading", text: l.steps },
            { kind: "list", items: r.steps.filter(Boolean), ordered: true },
            { kind: "heading", text: l.expected },
            { kind: "paragraph", text: r.expected },
            { kind: "heading", text: l.actual },
            { kind: "paragraph", text: r.actual },
            ...(r.possibleCause
                ? ([
                      { kind: "heading", text: l.possibleCause },
                      { kind: "paragraph", text: r.possibleCause },
                  ] as Block[])
                : []),
            ...(r.regressionTest
                ? ([
                      { kind: "heading", text: l.regressionTest },
                      { kind: "paragraph", text: r.regressionTest },
                  ] as Block[])
                : []),
        ],
        sheet: {
            name: "Bug report",
            columns: ["Field", "Value"],
            widths: [24, 90],
            rows: [
                ...fields,
                [l.summary, r.summary],
                [l.steps, r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")],
                [l.expected, r.expected],
                [l.actual, r.actual],
                ...(r.possibleCause ? [[l.possibleCause, r.possibleCause]] : []),
                ...(r.regressionTest ? [[l.regressionTest, r.regressionTest]] : []),
            ],
        },
    };
};

const caseRows = (cases: TestCase[]) =>
    cases.map((c) => [
        c.id,
        c.title,
        c.type,
        c.priority,
        c.preconditions ?? "",
        c.steps
            .filter(Boolean)
            .map((s, i) => `${i + 1}. ${s}`)
            .join("\n"),
        c.expected,
    ]);

export const casesToDoc = (title: string, cases: TestCase[], assumptions: string[], files: GeneratedFile[], target?: CodeTarget): ExportDoc => ({
    fileName: `test-cases-${fileSafe(title)}`,
    title: `Test cases: ${title}`,
    meta: [["Cases", String(cases.length)], ...(target ? ([["Automation", `${describeTarget(target)} (${runnerFor(target)})`]] as [string, string][]) : [])],
    blocks: [
        ...(assumptions.length
            ? ([
                  { kind: "heading", text: "Assumptions" },
                  { kind: "list", items: assumptions },
              ] as Block[])
            : []),
        { kind: "heading", text: "Test cases" },
        {
            kind: "table",
            columns: ["ID", "Title", "Type", "Priority", "Preconditions", "Steps", "Expected result"],
            rows: caseRows(cases),
            widths: [14, 28, 10, 9, 20, 40, 32],
        },
        ...(files.length
            ? ([{ kind: "heading", text: "Automation code" }, ...files.map((f) => ({ kind: "code", title: f.path, text: f.content }))] as Block[])
            : []),
    ],
});

export const docToMarkdown = (d: ExportDoc) => {
    const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
    const out = [`# ${d.title}`, "", ...d.meta.map(([k, v]) => `**${k}:** ${v}  `), ""];
    for (const b of d.blocks) {
        if (b.kind === "heading") out.push(`## ${b.text}`, "");
        if (b.kind === "paragraph") out.push(b.text, "");
        if (b.kind === "list") out.push(...b.items.map((item, i) => `${b.ordered ? `${i + 1}.` : "-"} ${item}`), "");
        if (b.kind === "table")
            out.push(
                `| ${b.columns.join(" | ")} |`,
                `| ${b.columns.map(() => "---").join(" | ")} |`,
                ...b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
                "",
            );
        if (b.kind === "code") {
            const lang = b.title.split(".").pop() === "feature" ? "gherkin" : (b.title.split(".").pop() ?? "");
            out.push(
                `### \`${b.title}\``,
                "",
                "```" + ({ cs: "csharp", py: "python", ts: "typescript", js: "javascript", md: "markdown" }[lang] ?? lang),
                b.text.trimEnd(),
                "```",
                "",
            );
        }
    }
    return out.join("\n");
};
