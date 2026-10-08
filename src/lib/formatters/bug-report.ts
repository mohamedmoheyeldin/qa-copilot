import type { BugReport, OutputFormat, TrackerProfile } from "../types";

interface Section {
    label: string;
    value?: string;
    list?: string[];
}

const sections = (r: BugReport, t: TrackerProfile): Section[] => {
    const l = t.labels;
    const out: Section[] = [
        { label: l.summary, value: r.summary },
        { label: l.steps, list: r.steps },
        { label: l.expected, value: r.expected },
        { label: l.actual, value: r.actual },
        { label: l.environment, value: r.environment },
        { label: l.severity, value: r.severity },
        { label: l.priority, value: r.priority },
    ];
    for (const [k, v] of Object.entries(r.customFields ?? {})) if (v) out.push({ label: k, value: v });
    if (r.possibleCause) out.push({ label: l.possibleCause, value: r.possibleCause });
    if (r.regressionTest) out.push({ label: l.regressionTest, value: r.regressionTest });
    return out.filter((s) => s.value || s.list?.length);
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const toMarkdown = (r: BugReport, t: TrackerProfile) =>
    [
        `## ${r.title}`,
        ...sections(r, t).map((s) => (s.list ? `### ${s.label}\n${s.list.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : `### ${s.label}\n${s.value}`)),
    ].join("\n\n");

export const toJiraWiki = (r: BugReport, t: TrackerProfile) =>
    [
        `h2. ${r.title}`,
        ...sections(r, t).map((s) => (s.list ? `h3. ${s.label}\n${s.list.map((x) => `# ${x}`).join("\n")}` : `h3. ${s.label}\n${s.value}`)),
    ].join("\n\n");

export const toPlainText = (r: BugReport, t: TrackerProfile) =>
    [r.title, "", ...sections(r, t).flatMap((s) => [`${s.label}:`, ...(s.list ? s.list.map((x, i) => `  ${i + 1}. ${x}`) : [`  ${s.value}`]), ""])].join("\n");

export const toHtml = (r: BugReport, t: TrackerProfile) =>
    [
        `<h2>${escapeHtml(r.title)}</h2>`,
        ...sections(r, t).map((s) =>
            s.list
                ? `<h3>${escapeHtml(s.label)}</h3><ol>${s.list.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>`
                : `<h3>${escapeHtml(s.label)}</h3><p>${escapeHtml(s.value ?? "")}</p>`,
        ),
    ].join("");

export const formatReport = (r: BugReport, t: TrackerProfile, format: OutputFormat) => {
    switch (format) {
        case "jira-wiki":
            return toJiraWiki(r, t);
        case "markdown":
            return toMarkdown(r, t);
        case "plain":
            return toPlainText(r, t);
        case "rich":
            return toHtml(r, t);
    }
};

/** Copies formatted HTML so it pastes with formatting into Jira Cloud, Azure DevOps, Confluence and most editors. */
export const copyRichText = async (html: string, plain: string) => {
    if ("ClipboardItem" in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([plain], { type: "text/plain" }),
            }),
        ]);
        return;
    }
    await navigator.clipboard.writeText(plain);
};

export const toCsvRow = (r: BugReport, t: TrackerProfile) => {
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const desc = toPlainText({ ...r, title: "" }, t).trim();
    const custom = t.customFields.map((f) => r.customFields?.[f] ?? "");
    const header = ["Summary", "Description", t.labels.severity, t.labels.priority, ...t.customFields];
    const row = [r.title, desc, r.severity, r.priority, ...custom];
    return `${header.map(q).join(",")}\n${row.map(q).join(",")}\n`;
};
