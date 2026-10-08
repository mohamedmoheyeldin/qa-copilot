import type { TestCase } from "../types";

const q = (v: string) => `"${v.replace(/"/g, '""')}"`;

export const casesToCsv = (cases: TestCase[]) => {
    const header = ["ID", "Title", "Type", "Priority", "Preconditions", "Steps", "Expected Result"];
    const rows = cases.map((c) =>
        [c.id, c.title, c.type, c.priority, c.preconditions ?? "", c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"), c.expected].map(q).join(","),
    );
    return [header.map(q).join(","), ...rows].join("\n") + "\n";
};

export const casesToMarkdown = (cases: TestCase[]) =>
    cases
        .map(
            (c) =>
                `### ${c.id}: ${c.title}\n**Type:** ${c.type} | **Priority:** ${c.priority}\n${
                    c.preconditions ? `**Preconditions:** ${c.preconditions}\n` : ""
                }\n${c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n**Expected:** ${c.expected}`,
        )
        .join("\n\n---\n\n");

export const casesToGherkin = (cases: TestCase[], feature: string) =>
    [
        `Feature: ${feature}`,
        ...cases.map((c) => {
            const [first, ...rest] = c.steps;
            return [
                `\n  @${c.priority} @${c.type}`,
                `  Scenario: ${c.title}`,
                c.preconditions ? `    Given ${c.preconditions}` : "",
                first ? `    ${c.preconditions ? "When" : "Given"} ${first}` : "",
                ...rest.map((s) => `    And ${s}`),
                `    Then ${c.expected}`,
            ]
                .filter(Boolean)
                .join("\n");
        }),
    ].join("\n");

export const downloadText = (filename: string, text: string, type = "text/plain") => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
