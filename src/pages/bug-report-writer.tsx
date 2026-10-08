import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Check, Copy01, Download01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { ExportMenu } from "@/components/qa/export-menu";
import { HistoryNotice } from "@/components/qa/history-notice";
import { ModeNotice } from "@/components/qa/mode-notice";
import { Panel } from "@/components/qa/page-header";
import { GenerateBar, SamplePicker, ToolLayout, ToolOutput } from "@/components/qa/tool";
import { useGenerator } from "@/hooks/use-generator";
import { useHistoryEntry } from "@/hooks/use-history-entry";
import { bugReportSchema } from "@/lib/ai/parse";
import { bugSamples, demoBugReport, demoManualBugReport, pickDemo } from "@/lib/demo-data";
import { bugToDoc } from "@/lib/export/model";
import { copyRichText, formatReport, toCsvRow, toHtml, toPlainText } from "@/lib/formatters/bug-report";
import { downloadText } from "@/lib/formatters/test-cases";
import { history } from "@/lib/history";
import { buildBugPrompt } from "@/lib/prompts";
import { useSettings } from "@/lib/settings-context";
import type { BugReport, BugSource, OutputFormat, TrackerProfile } from "@/lib/types";

const sources: { id: BugSource; label: string }[] = [
    { id: "manual", label: "Manual testing notes" },
    { id: "playwright", label: "Playwright failure" },
    { id: "cypress", label: "Cypress failure" },
    { id: "selenium", label: "Selenium failure" },
    { id: "support", label: "Customer or support ticket" },
    { id: "other", label: "Other" },
];

const formatLabels: Record<OutputFormat, string> = {
    rich: "Rich text",
    "jira-wiki": "Jira wiki markup",
    markdown: "Markdown",
    plain: "Plain text",
};

export const BugReportWriter = () => {
    const { settings, update } = useSettings();
    const [input, setInput] = useState("");
    const [source, setSource] = useState<BugSource>("manual");
    const tracker = settings.trackers.find((t) => t.id === settings.activeTrackerId) ?? settings.trackers[0];

    const buildPrompt = useCallback((text: string) => buildBugPrompt(text, source, tracker, settings), [source, tracker, settings]);
    const demoResult = useCallback((text: string) => pickDemo(text, bugSamples, [demoManualBugReport, demoBugReport]), []);

    // Every successful generation lands in history; edits keep that entry in sync.
    const [historyId, setHistoryId] = useState<string | null>(null);
    const [openedFromHistory, setOpenedFromHistory] = useState(false);
    const onResult = useCallback(
        (report: BugReport, sentInput: string) => {
            setOpenedFromHistory(false);
            setHistoryId(
                history.add({
                    tool: "bug",
                    title: report.title,
                    input: sentInput,
                    mode: settings.aiMode,
                    result: report,
                    meta: { source, trackerId: tracker.id },
                }),
            );
        },
        [settings.aiMode, source, tracker.id],
    );
    const gen = useGenerator({ schema: bugReportSchema, buildPrompt, demoResult, onResult });

    const editReport = (report: BugReport) => {
        gen.setResult(report);
        if (historyId) history.update(historyId, { result: report, title: report.title });
    };

    useHistoryEntry(
        "bug",
        useCallback((entry) => {
            setInput(entry.input);
            setSource(entry.meta.source);
            if (settings.trackers.some((t) => t.id === entry.meta.trackerId)) update({ activeTrackerId: entry.meta.trackerId });
            gen.restore(entry.result);
            setHistoryId(entry.id);
            setOpenedFromHistory(true);
        }, []),
    );

    return (
        <ToolLayout
            title="Bug report writer"
            description="Paste rough notes, a failed test, or a support ticket. Get a clean report formatted for your tracker."
            input={
                <Panel title="Input">
                    <div className="flex flex-col gap-5">
                        <SamplePicker
                            samples={bugSamples}
                            onPick={(s) => {
                                setInput(s.input);
                                setSource(s.source);
                            }}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Source" items={sources} selectedKey={source} onSelectionChange={(k) => k && setSource(k as BugSource)}>
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                            <Select
                                label="Tracker"
                                items={settings.trackers.map((t) => ({ id: t.id, label: t.name }))}
                                selectedKey={tracker.id}
                                onSelectionChange={(k) => k && update({ activeTrackerId: String(k) })}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        </div>

                        <TextArea
                            label="What happened?"
                            rows={10}
                            value={input}
                            onChange={setInput}
                            placeholder="Checkout hangs on Safari after clicking Pay. Works on Chrome. Staging."
                        />

                        {openedFromHistory && <HistoryNotice />}

                        <ModeNotice redactedCount={gen.redactedCount} />

                        <GenerateBar
                            label="Write bug report"
                            isLoading={gen.status === "loading"}
                            isDisabled={!input.trim()}
                            onGenerate={() => gen.generate(input)}
                            onCancel={gen.cancel}
                            testId="generate-bug-report"
                        />
                    </div>
                </Panel>
            }
            output={
                <ToolOutput gen={gen} emptyTitle="Your report appears here" emptyBody="Add some notes or load a sample, then select Write bug report.">
                    {(report) => <ReportResult report={report} tracker={tracker} onChange={editReport} />}
                </ToolOutput>
            }
        />
    );
};

const ReportResult = ({ report, tracker, onChange }: { report: BugReport; tracker: TrackerProfile; onChange: (r: BugReport) => void }) => {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = async (format: OutputFormat | "csv") => {
        if (format === "csv") {
            downloadText("bug-report.csv", toCsvRow(report, tracker), "text/csv");
            return;
        }
        if (format === "rich") await copyRichText(toHtml(report, tracker), toPlainText(report, tracker));
        else await navigator.clipboard.writeText(formatReport(report, tracker, format));
        setCopied(format);
        setTimeout(() => setCopied(null), 2000);
    };

    const otherFormats = useMemo(() => (["rich", "jira-wiki", "markdown", "plain"] as OutputFormat[]).filter((f) => f !== tracker.format), [tracker.format]);

    return (
        <Panel
            title="Bug report"
            actions={
                <div className="flex flex-wrap gap-2">
                    <ExportMenu getDoc={() => bugToDoc(report, tracker)} />
                    <Button size="sm" iconLeading={copied === tracker.format ? Check : Copy01} onClick={() => copy(tracker.format)} data-testid="copy-primary">
                        {copied === tracker.format ? "Copied" : `Copy for ${tracker.name}`}
                    </Button>
                </div>
            }
        >
            <Tabs>
                <Tabs.List type="underline" size="sm" className="mb-5">
                    <Tabs.Item id="preview">Preview</Tabs.Item>
                    <Tabs.Item id="edit">Edit</Tabs.Item>
                </Tabs.List>
                <Tabs.Panel id="preview">
                    <ReportPreview report={report} tracker={tracker} />
                </Tabs.Panel>
                <Tabs.Panel id="edit">
                    <ReportEditor report={report} tracker={tracker} onChange={onChange} />
                </Tabs.Panel>
            </Tabs>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-secondary pt-4">
                <span className="text-sm text-tertiary">Also copy as:</span>
                {otherFormats.map((f) => (
                    <Button key={f} size="sm" color="secondary" iconLeading={copied === f ? Check : undefined} onClick={() => copy(f)}>
                        {copied === f ? "Copied" : formatLabels[f]}
                    </Button>
                ))}
                <Button size="sm" color="secondary" iconLeading={Download01} onClick={() => copy("csv")}>
                    CSV for import
                </Button>
            </div>
        </Panel>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <h3 className="text-sm font-semibold text-secondary">{label}</h3>
        <div className="mt-1 text-md text-primary">{children}</div>
    </div>
);

const ReportPreview = ({ report, tracker }: { report: BugReport; tracker: TrackerProfile }) => {
    const l = tracker.labels;
    return (
        <article className="flex flex-col gap-5" data-testid="bug-report-preview">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-primary">{report.title}</h2>
                <div className="flex gap-2">
                    <Badge color="error" size="sm">
                        {report.severity}
                    </Badge>
                    <Badge color="warning" size="sm">
                        {report.priority}
                    </Badge>
                </div>
            </div>
            <Field label={l.summary}>{report.summary}</Field>
            <Field label={l.steps}>
                <ol className="list-decimal pl-5">
                    {report.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                    ))}
                </ol>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
                <Field label={l.expected}>{report.expected}</Field>
                <Field label={l.actual}>{report.actual}</Field>
            </div>
            <Field label={l.environment}>{report.environment}</Field>
            {Object.entries(report.customFields ?? {}).map(([k, v]) => (
                <Field key={k} label={k}>
                    {v}
                </Field>
            ))}
            {report.possibleCause && <Field label={l.possibleCause}>{report.possibleCause}</Field>}
            {report.regressionTest && (
                <Field label={l.regressionTest}>
                    <p>{report.regressionTest}</p>
                    <SendToTestGenerator report={report} />
                </Field>
            )}
        </article>
    );
};

const ReportEditor = ({ report, tracker, onChange }: { report: BugReport; tracker: TrackerProfile; onChange: (r: BugReport) => void }) => {
    const set = <K extends keyof BugReport>(key: K, value: BugReport[K]) => onChange({ ...report, [key]: value });
    const l = tracker.labels;
    const scaleItems = (scale: string[]) => scale.map((s) => ({ id: s, label: s }));

    return (
        <div className="flex flex-col gap-4">
            <Input label="Title" value={report.title} onChange={(v) => set("title", v)} />
            <TextArea label={l.summary} rows={3} value={report.summary} onChange={(v) => set("summary", v)} />
            <TextArea label={l.steps} hint="One step per line" rows={5} value={report.steps.join("\n")} onChange={(v) => set("steps", v.split("\n"))} />
            <div className="grid gap-4 sm:grid-cols-2">
                <TextArea label={l.expected} rows={3} value={report.expected} onChange={(v) => set("expected", v)} />
                <TextArea label={l.actual} rows={3} value={report.actual} onChange={(v) => set("actual", v)} />
            </div>
            <Input label={l.environment} value={report.environment} onChange={(v) => set("environment", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
                <Select
                    label={l.severity}
                    items={scaleItems(tracker.severityScale)}
                    selectedKey={report.severity}
                    onSelectionChange={(k) => set("severity", String(k))}
                >
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
                <Select
                    label={l.priority}
                    items={scaleItems(tracker.priorityScale)}
                    selectedKey={report.priority}
                    onSelectionChange={(k) => set("priority", String(k))}
                >
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
            </div>
            {tracker.customFields.map((f) => (
                <Input key={f} label={f} value={report.customFields?.[f] ?? ""} onChange={(v) => set("customFields", { ...report.customFields, [f]: v })} />
            ))}
        </div>
    );
};

/** Hands the bug off to the test case generator, so the two tools work as one flow. */
const SendToTestGenerator = ({ report }: { report: BugReport }) => {
    const navigate = useNavigate();
    const requirement = [
        `Regression tests for this bug: ${report.title}`,
        "",
        `Expected behavior: ${report.expected}`,
        `Bug behavior: ${report.actual}`,
        `Environment: ${report.environment}`,
        "",
        `Steps that reproduce it:\n${report.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
        "",
        `Suggested test: ${report.regressionTest ?? ""}`,
    ].join("\n");

    return (
        <Button
            className="mt-2"
            size="sm"
            color="link-color"
            iconTrailing={ArrowRight}
            onClick={() => navigate("/test-cases", { state: { requirement } })}
            data-testid="send-to-test-generator"
        >
            Generate test cases for this bug
        </Button>
    );
};
