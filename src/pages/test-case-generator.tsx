import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy01, Download01, Edit05, Lightning01, Plus, RefreshCw01, Stars02, Trash01 } from "@untitledui/icons";
import { useLocation } from "react-router";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";
import { CodeViewer } from "@/components/qa/code-viewer";
import { ExportMenu } from "@/components/qa/export-menu";
import { HistoryNotice } from "@/components/qa/history-notice";
import { ModeNotice } from "@/components/qa/mode-notice";
import { Panel } from "@/components/qa/page-header";
import { PromptOnlyPanel } from "@/components/qa/prompt-only-panel";
import { GenerateBar, SamplePicker, ToolLayout, ToolOutput } from "@/components/qa/tool";
import { useClipboard } from "@/hooks/use-clipboard";
import { useGenerator } from "@/hooks/use-generator";
import { useHistoryEntry } from "@/hooks/use-history-entry";
import { filesSchema, testGenSchema } from "@/lib/ai/parse";
import { scaffold } from "@/lib/codegen";
import { demoCouponResult, demoTestResult, pickDemo, testSamples } from "@/lib/demo-data";
import { casesToDoc } from "@/lib/export/model";
import { casesToCsv, casesToMarkdown, downloadText } from "@/lib/formatters/test-cases";
import { describeTarget, frameworkIds, frameworks, languageLabels, languagesFor, normalizeTarget, runnerFor, sameTarget } from "@/lib/frameworks";
import { history } from "@/lib/history";
import { buildCodePrompt, buildTestGenPrompt } from "@/lib/prompts";
import { useSettings } from "@/lib/settings-context";
import type { AiMode, CodeTarget, Framework, Language, TestCase, TestGenResult, TestGenSettings, TestType } from "@/lib/types";

const testTypes: { id: TestType; label: string }[] = [
    { id: "happy", label: "Happy path" },
    { id: "negative", label: "Negative" },
    { id: "edge", label: "Edge cases" },
    { id: "accessibility", label: "Accessibility" },
    { id: "api", label: "API" },
];

const priorityColor = { high: "error", medium: "warning", low: "gray" } as const;
const stopWords = /\s+(from|the|a|an|to|in|on|at|of|with|and|for|so|that|my|our)$/i;

/** A short feature name from a requirement: "I want to reset my password from..." becomes "Reset my password". */
export const featureNameFrom = (text: string) => {
    const goal = text.match(/\bI (?:want|can|need|should be able) to (.+?)(?:\s+so that|[.,;\n]|$)/i)?.[1] ?? text.split("\n").find((l) => l.trim()) ?? "";
    let words = goal
        .replace(/^[-*#\d.\s]+/, "")
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .join(" ");
    while (stopWords.test(words)) words = words.replace(stopWords, "");
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
};

export const TestCaseGenerator = () => {
    const { settings, update } = useSettings();
    const t = settings.testGen;
    const setT = (patch: Partial<TestGenSettings>) => update({ testGen: { ...t, ...patch } });
    const current: CodeTarget = useMemo(() => normalizeTarget({ framework: t.framework, language: t.language, bdd: t.bdd }), [t.framework, t.language, t.bdd]);
    const location = useLocation();

    // A bug report can hand its details over to this page.
    const handoff = (location.state as { requirement?: string } | null)?.requirement ?? "";
    const [input, setInput] = useState(handoff);
    const [featureName, setFeatureName] = useState(() => featureNameFrom(handoff));
    const [nameEdited, setNameEdited] = useState(false);
    const changeInput = (value: string, name?: string) => {
        setInput(value);
        if (!nameEdited || name) setFeatureName(name ?? featureNameFrom(value));
        if (name) setNameEdited(false);
    };
    const suiteName = featureName.trim() || "Generated tests";
    const scaffoldOpts = useMemo(
        () => ({ name: suiteName, tags: t.tags, selectors: { strategy: t.selectorStrategy, testIdAttribute: t.testIdAttribute } }),
        [suiteName, t.tags, t.selectorStrategy, t.testIdAttribute],
    );

    // What the current code was generated for, and how the result was produced.
    const [generatedWith, setGeneratedWith] = useState<CodeTarget>(current);
    const [resultMode, setResultMode] = useState<AiMode>(settings.aiMode);
    const [casesEdited, setCasesEdited] = useState(false);
    const [historyId, setHistoryId] = useState<string | null>(null);
    const [openedFromHistory, setOpenedFromHistory] = useState(false);
    const pending = useRef({ target: current, mode: settings.aiMode });

    const buildPrompt = useCallback((text: string) => buildTestGenPrompt(text, settings, suiteName), [settings, suiteName]);
    const demoResult = useCallback((text: string) => pickDemo(text, testSamples, [demoTestResult, demoCouponResult]), []);
    const onResult = useCallback(
        (raw: TestGenResult, sentInput: string) => {
            const { target, mode } = pending.current;
            const result = mode === "demo" || !raw.files.length ? { ...raw, files: scaffold(raw.cases, target, scaffoldOpts) } : raw;
            setGeneratedWith(target);
            setResultMode(mode);
            setCasesEdited(false);
            setOpenedFromHistory(false);
            setHistoryId(history.add({ tool: "tests", title: suiteName, input: sentInput, mode, result, meta: target }));
            return result;
        },
        [scaffoldOpts, suiteName],
    );
    const gen = useGenerator<TestGenResult>({ schema: testGenSchema, buildPrompt, demoResult, onResult: (r, s) => void gen.setResult(onResult(r, s)) });

    const generate = () => {
        pending.current = { target: current, mode: settings.aiMode };
        gen.generate(input);
    };

    // Demo results rebuild their code live from the current cases and options. AI results keep their own code.
    const live = resultMode === "demo";
    const files = useMemo(
        () => (gen.result ? (live ? scaffold(gen.result.cases, current, scaffoldOpts) : gen.result.files) : []),
        [gen.result, live, current, scaffoldOpts],
    );
    const codeTarget = live ? current : generatedWith;
    const optionsChanged = !live && !sameTarget(generatedWith, current);

    const saveResult = (result: TestGenResult, meta?: CodeTarget) => {
        gen.setResult(result);
        if (historyId) history.update(historyId, { result, ...(meta ? { meta } : {}) });
    };
    const editCases = (cases: TestCase[]) => {
        setCasesEdited(true);
        saveResult({ ...gen.result!, cases, files: live ? scaffold(cases, current, scaffoldOpts) : gen.result!.files });
    };

    // Code-only conversion: keeps the (possibly edited) cases and rewrites just the code.
    const resultRef = useRef(gen.result);
    resultRef.current = gen.result;
    const applyFiles = useCallback(
        (newFiles: TestGenResult["files"], target: CodeTarget) => {
            const result = { ...resultRef.current!, files: newFiles };
            gen.setResult(result);
            setGeneratedWith(target);
            setCasesEdited(false);
            if (historyId) history.update(historyId, { result, meta: target });
        },
        [historyId],
    );
    const codeGen = useGenerator({
        schema: filesSchema,
        buildPrompt: useCallback(() => buildCodePrompt(resultRef.current?.cases ?? [], settings, suiteName), [settings, suiteName]),
        demoResult: useCallback(() => ({ files: scaffold(resultRef.current?.cases ?? [], current, scaffoldOpts) }), [current, scaffoldOpts]),
        onResult: useCallback((r: { files: TestGenResult["files"] }) => applyFiles(r.files, pending.current.target), [applyFiles]),
    });
    const updateWithAi = () => {
        pending.current = { target: current, mode: settings.aiMode };
        codeGen.generate("cases");
    };
    const convertOffline = () => applyFiles(scaffold(gen.result!.cases, current, scaffoldOpts), current);

    const restore = gen.restore;
    useHistoryEntry(
        "tests",
        useCallback(
            (entry) => {
                setInput(entry.input);
                setFeatureName(entry.title);
                setNameEdited(true);
                update({ testGen: { ...settings.testGen, ...entry.meta } });
                setGeneratedWith(entry.meta);
                setResultMode(entry.mode);
                setCasesEdited(false);
                restore(entry.result);
                setHistoryId(entry.id);
                setOpenedFromHistory(true);
            },
            // Runs once per opened entry.
            [restore],
        ),
    );

    // Keep the language valid when the framework changes.
    const setFramework = (framework: Framework) => {
        const languages = languagesFor(framework);
        setT({ framework, language: languages.includes(t.language) ? t.language : languages[0] });
    };
    useEffect(() => {
        if (!sameTarget(normalizeTarget(current), { framework: t.framework, language: t.language, bdd: t.bdd })) setT({ language: current.language });
    }, [current]);

    const toggleType = (type: TestType, on: boolean) => setT({ testTypes: on ? [...new Set([...t.testTypes, type])] : t.testTypes.filter((x) => x !== type) });

    return (
        <ToolLayout
            wideOutput
            title="Test case generator"
            description="Paste a user story or acceptance criteria. Get test cases and starter automation for Playwright, Cypress, Selenium, or WebdriverIO, with optional Cucumber BDD."
            input={
                <Panel title="Requirement">
                    <div className="flex flex-col gap-5">
                        <SamplePicker samples={testSamples} onPick={(s) => changeInput(s.input, s.label)} />

                        <TextArea
                            label="User story or acceptance criteria"
                            rows={8}
                            value={input}
                            onChange={(v) => changeInput(v)}
                            placeholder="As a shopper, I can apply one coupon code at checkout..."
                        />

                        <Input
                            label="Feature name"
                            value={featureName}
                            onChange={(v) => {
                                setFeatureName(v);
                                setNameEdited(true);
                            }}
                            placeholder="Password reset"
                            hint="Used for the suite, the feature file, and file names."
                        />

                        <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg bg-secondary p-4">
                            <legend className="sr-only">Automation</legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Select
                                    label="Framework"
                                    items={frameworkIds.map((id) => ({ id, label: frameworks[id].label }))}
                                    selectedKey={current.framework}
                                    onSelectionChange={(k) => k && setFramework(k as Framework)}
                                    data-testid="framework-select"
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                                <Select
                                    label="Language"
                                    items={languagesFor(current.framework).map((id) => ({ id, label: languageLabels[id] }))}
                                    selectedKey={current.language}
                                    onSelectionChange={(k) => k && setT({ language: k as Language })}
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                            <Toggle
                                label="Cucumber BDD"
                                hint="Feature file, step definitions, and hooks."
                                isSelected={current.bdd}
                                onChange={(bdd) => setT({ bdd })}
                            />
                            <p className="text-sm text-tertiary">
                                Runner: <span className="font-medium text-secondary">{runnerFor(current)}</span>
                            </p>
                        </fieldset>

                        <Select
                            label="Number of cases"
                            items={[3, 5, 6, 8, 10, 15, 20].map((n) => ({ id: String(n), label: String(n) }))}
                            selectedKey={String(t.caseCount)}
                            onSelectionChange={(k) => k && setT({ caseCount: Number(k) })}
                        >
                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                        </Select>

                        <fieldset className="flex min-w-0 flex-col gap-2">
                            <legend className="mb-1 text-sm font-medium text-secondary">Test types</legend>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                {testTypes.map((type) => (
                                    <Checkbox
                                        key={type.id}
                                        label={type.label}
                                        isSelected={t.testTypes.includes(type.id)}
                                        onChange={(on) => toggleType(type.id, on)}
                                    />
                                ))}
                            </div>
                        </fieldset>

                        <p className="text-sm text-tertiary">
                            Selectors, page objects, naming, tags, and your style sample live in{" "}
                            <Button color="link-color" size="sm" href="/settings">
                                Settings
                            </Button>
                            .
                        </p>

                        {openedFromHistory && <HistoryNotice />}
                        <ModeNotice redactedCount={gen.redactedCount} />

                        <GenerateBar
                            label="Generate test cases"
                            isLoading={gen.status === "loading"}
                            isDisabled={!input.trim() || t.testTypes.length === 0}
                            onGenerate={generate}
                            onCancel={gen.cancel}
                            testId="generate-test-cases"
                        />
                    </div>
                </Panel>
            }
            output={
                <ToolOutput
                    gen={gen}
                    emptyTitle="Your test cases appear here"
                    emptyBody="Paste a requirement or load a sample, then select Generate test cases."
                >
                    {(result) => (
                        <TestResults
                            result={result}
                            files={files}
                            suiteName={suiteName}
                            codeTarget={codeTarget}
                            current={current}
                            live={live}
                            optionsChanged={optionsChanged}
                            casesEdited={casesEdited && !live}
                            onCasesChange={editCases}
                            codeGen={codeGen}
                            onUpdateWithAi={updateWithAi}
                            onConvertOffline={convertOffline}
                            aiMode={settings.aiMode}
                        />
                    )}
                </ToolOutput>
            }
        />
    );
};

/** Next free ID in the same style as the existing ones (SHOP-TC-001, SHOP-TC-007, ...). */
const nextCaseId = (cases: TestCase[]) => {
    const nums = cases.map((c) => Number(c.id.match(/(\d+)\s*$/)?.[1] ?? 0));
    const prefix = cases[0]?.id.match(/^(.*?)(\d+)\s*$/)?.[1] ?? "TC-";
    const width = cases[0]?.id.match(/(\d+)\s*$/)?.[1].length ?? 3;
    return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
};

interface TestResultsProps {
    result: TestGenResult;
    files: TestGenResult["files"];
    suiteName: string;
    codeTarget: CodeTarget;
    current: CodeTarget;
    live: boolean;
    optionsChanged: boolean;
    casesEdited: boolean;
    onCasesChange: (cases: TestCase[]) => void;
    codeGen: ReturnType<typeof useGenerator<{ files: TestGenResult["files"] }>>;
    onUpdateWithAi: () => void;
    onConvertOffline: () => void;
    aiMode: AiMode;
}

const TestResults = ({
    result,
    files,
    suiteName,
    codeTarget,
    current,
    live,
    optionsChanged,
    casesEdited,
    onCasesChange,
    codeGen,
    onUpdateWithAi,
    onConvertOffline,
    aiMode,
}: TestResultsProps) => {
    const casesClipboard = useClipboard();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newCaseId, setNewCaseId] = useState<string | null>(null);
    const stale = optionsChanged || casesEdited;
    const updating = codeGen.status === "loading";

    const saveCase = (updated: TestCase) => onCasesChange(result.cases.map((c) => (c.id === editingId ? updated : c)));
    const removeCase = (id: string) => onCasesChange(result.cases.filter((c) => c.id !== id));
    const addCase = () => {
        const id = nextCaseId(result.cases);
        onCasesChange([...result.cases, { id, title: "New test case", type: "happy", priority: "medium", steps: [""], expected: "" }]);
        setEditingId(id);
        setNewCaseId(id);
    };
    const cancelEdit = () => {
        if (editingId && editingId === newCaseId) removeCase(editingId);
        setEditingId(null);
        setNewCaseId(null);
    };

    return (
        <Panel
            title={`${result.cases.length} test ${result.cases.length === 1 ? "case" : "cases"}`}
            actions={<ExportMenu getDoc={() => casesToDoc(suiteName, result.cases, result.assumptions, files, codeTarget)} />}
        >
            <Tabs>
                <Tabs.List type="underline" size="sm" className="mb-5">
                    <Tabs.Item id="cases">Test cases</Tabs.Item>
                    <Tabs.Item id="code" badge={stale ? "!" : files.filter((f) => f.path !== "README.md").length || undefined}>
                        Code
                    </Tabs.Item>
                    <Tabs.Item id="assumptions" badge={result.assumptions.length || undefined}>
                        Assumptions
                    </Tabs.Item>
                </Tabs.List>

                <Tabs.Panel id="cases">
                    <div className="overflow-x-auto rounded-lg ring-1 ring-secondary">
                        <table className="w-full text-left text-sm" data-testid="test-case-table">
                            <caption className="sr-only">Generated test cases. Each row can be edited or deleted.</caption>
                            <thead className="bg-secondary text-xs font-medium text-tertiary">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        ID
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Test case
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Type
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Priority
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.cases.map((c) =>
                                    c.id === editingId ? (
                                        <tr key={c.id} className="border-t border-secondary">
                                            <td colSpan={5} className="px-4 py-4">
                                                <CaseEditor
                                                    testCase={c}
                                                    onSave={(u) => {
                                                        saveCase(u);
                                                        setEditingId(null);
                                                        setNewCaseId(null);
                                                    }}
                                                    onCancel={cancelEdit}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={c.id} className="border-t border-secondary align-top">
                                            <th scope="row" className="px-4 py-3 text-xs font-medium whitespace-nowrap text-primary">
                                                {c.id}
                                            </th>
                                            <td className="min-w-64 px-4 py-3 text-secondary">
                                                <p className="font-medium text-primary">{c.title}</p>
                                                {c.preconditions && (
                                                    <p className="mt-1">
                                                        <span className="font-medium">Given:</span> {c.preconditions}
                                                    </p>
                                                )}
                                                <ol className="mt-1 list-decimal pl-4">
                                                    {c.steps.filter(Boolean).map((s, i) => (
                                                        <li key={i}>{s}</li>
                                                    ))}
                                                </ol>
                                                <p className="mt-1">
                                                    <span className="font-medium">Expected:</span> {c.expected}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge size="sm" color="gray">
                                                    {c.type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge size="sm" color={priorityColor[c.priority]}>
                                                    {c.priority}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="tertiary"
                                                        icon={Edit05}
                                                        tooltip={`Edit ${c.id}`}
                                                        onClick={() => setEditingId(c.id)}
                                                    />
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="tertiary"
                                                        icon={Trash01}
                                                        tooltip={`Delete ${c.id}`}
                                                        onClick={() => removeCase(c.id)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" color="secondary" iconLeading={Plus} onClick={addCase} isDisabled={!!editingId}>
                            Add case
                        </Button>
                        <Button
                            size="sm"
                            color="secondary"
                            iconLeading={casesClipboard.copied ? Check : Copy01}
                            onClick={() => casesClipboard.copy(casesToMarkdown(result.cases))}
                        >
                            {casesClipboard.copied ? "Copied" : "Copy as Markdown"}
                        </Button>
                        <Button
                            size="sm"
                            color="secondary"
                            iconLeading={Download01}
                            onClick={() => downloadText("test-cases.csv", casesToCsv(result.cases), "text/csv")}
                        >
                            CSV
                        </Button>
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="code">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span data-testid="code-target">
                            <Badge size="md" color="brand">
                                {describeTarget(codeTarget)}
                            </Badge>
                        </span>
                        {live && (
                            <span className="text-sm text-tertiary">Updates instantly when you change the framework, language, BDD option, or cases.</span>
                        )}
                    </div>

                    {stale && (
                        <div
                            role="status"
                            data-testid="stale-code-notice"
                            className="mb-4 flex flex-col gap-3 rounded-lg bg-warning-primary p-4 text-sm text-primary ring-1 ring-secondary ring-inset"
                        >
                            <p className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" />
                                {optionsChanged
                                    ? `This code is for ${describeTarget(codeTarget)}, but your options now say ${describeTarget(current)}.`
                                    : "You edited the test cases, so this code no longer matches them."}{" "}
                                Update it to match. Your test cases stay as they are.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" iconLeading={Stars02} isLoading={updating} onClick={onUpdateWithAi} data-testid="update-code-ai">
                                    {aiMode === "prompt" ? "Update code (prompt)" : aiMode === "demo" ? "Update code" : "Update code with AI"}
                                </Button>
                                <Button
                                    size="sm"
                                    color="secondary"
                                    iconLeading={Lightning01}
                                    onClick={onConvertOffline}
                                    isDisabled={updating}
                                    data-testid="convert-offline"
                                >
                                    Convert instantly (offline)
                                </Button>
                            </div>
                            <p className="text-xs text-secondary">
                                The offline conversion builds starter code from the test cases without AI. The AI update writes richer code but takes a moment.
                            </p>
                        </div>
                    )}

                    {codeGen.status === "error" && (
                        <div
                            role="alert"
                            className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-error-primary p-3 text-sm text-error-primary"
                        >
                            {codeGen.error}
                            {codeGen.canRetry && (
                                <Button size="sm" color="secondary" iconLeading={RefreshCw01} onClick={codeGen.retry}>
                                    Try again
                                </Button>
                            )}
                        </div>
                    )}
                    {codeGen.status === "awaiting-paste" && (
                        <div className="mb-4">
                            <PromptOnlyPanel prompt={codeGen.pasteablePrompt} error={codeGen.error} onSubmit={codeGen.submitPasted} />
                        </div>
                    )}

                    <div className={updating ? "pointer-events-none opacity-50" : undefined} aria-busy={updating}>
                        <CodeViewer
                            files={files}
                            zipName={`${suiteName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${codeTarget.framework}-${codeTarget.language}${codeTarget.bdd ? "-bdd" : ""}`}
                        />
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="assumptions">
                    {result.assumptions.length ? (
                        <ul className="list-disc pl-5 text-md text-secondary">
                            {result.assumptions.map((a, i) => (
                                <li key={i}>{a}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-tertiary">No assumptions were needed.</p>
                    )}
                </Tabs.Panel>
            </Tabs>
        </Panel>
    );
};

const CaseEditor = ({ testCase, onSave, onCancel }: { testCase: TestCase; onSave: (c: TestCase) => void; onCancel: () => void }) => {
    const [draft, setDraft] = useState(testCase);
    const set = <K extends keyof TestCase>(key: K, value: TestCase[K]) => setDraft((d) => ({ ...d, [key]: value }));

    return (
        <div className="flex flex-col gap-4" data-testid="case-editor">
            <p className="text-sm font-semibold text-primary">Editing {testCase.id}</p>
            <Input label="Title" value={draft.title} onChange={(v) => set("title", v)} autoFocus />
            <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Type" items={testTypes} selectedKey={draft.type} onSelectionChange={(k) => k && set("type", k as TestType)}>
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
                <Select
                    label="Priority"
                    items={[
                        { id: "high", label: "High" },
                        { id: "medium", label: "Medium" },
                        { id: "low", label: "Low" },
                    ]}
                    selectedKey={draft.priority}
                    onSelectionChange={(k) => k && set("priority", k as TestCase["priority"])}
                >
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
            </div>
            <Input label="Preconditions" value={draft.preconditions ?? ""} onChange={(v) => set("preconditions", v || undefined)} />
            <TextArea label="Steps" hint="One step per line" rows={4} value={draft.steps.join("\n")} onChange={(v) => set("steps", v.split("\n"))} />
            <TextArea label="Expected result" rows={2} value={draft.expected} onChange={(v) => set("expected", v)} />
            <div className="flex gap-2">
                <Button
                    size="sm"
                    onClick={() => onSave({ ...draft, steps: draft.steps.map((s) => s.trim()).filter(Boolean) })}
                    isDisabled={!draft.title.trim()}
                >
                    Save case
                </Button>
                <Button size="sm" color="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
