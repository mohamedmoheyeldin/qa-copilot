import { useState } from "react";
import { CheckCircle, Download01, Plus, RefreshCw01, Trash01, Upload01, XCircle, Zap } from "@untitledui/icons";
import { Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { FileTrigger } from "@/components/base/file-upload-trigger/file-upload-trigger";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";
import { ListInput } from "@/components/qa/list-input";
import { PageHeader, Panel } from "@/components/qa/page-header";
import { listModels, providerInfo, testConnection } from "@/lib/ai/client";
import { defaultModels, defaultTrackers } from "@/lib/defaults";
import { redact } from "@/lib/redact";
import { exportSettings, parseImportedSettings, useSettings } from "@/lib/settings-context";
import type { AiMode, AiProvider, OutputFormat, TestGenSettings, TrackerProfile } from "@/lib/types";

export const SettingsPage = () => (
    <>
        <PageHeader title="Settings" description="Everything is saved in this browser only. Export your settings to share them with your team." />
        <Tabs>
            <Tabs.List type="underline" size="sm" className="mb-6 overflow-x-auto">
                <Tabs.Item id="ai">AI mode</Tabs.Item>
                <Tabs.Item id="project">Project</Tabs.Item>
                <Tabs.Item id="trackers">Trackers</Tabs.Item>
                <Tabs.Item id="tests">Test generation</Tabs.Item>
                <Tabs.Item id="privacy">Privacy</Tabs.Item>
                <Tabs.Item id="backup">Import and export</Tabs.Item>
            </Tabs.List>
            <div className="max-w-3xl">
                <Tabs.Panel id="ai">
                    <AiSettings />
                </Tabs.Panel>
                <Tabs.Panel id="project">
                    <ProjectSettings />
                </Tabs.Panel>
                <Tabs.Panel id="trackers">
                    <TrackerSettings />
                </Tabs.Panel>
                <Tabs.Panel id="tests">
                    <TestGenSettingsPanel />
                </Tabs.Panel>
                <Tabs.Panel id="privacy">
                    <PrivacySettings />
                </Tabs.Panel>
                <Tabs.Panel id="backup">
                    <BackupSettings />
                </Tabs.Panel>
            </div>
        </Tabs>
    </>
);

const AiSettings = () => {
    const { settings, update } = useSettings();

    return (
        <div className="flex flex-col gap-6">
            <Panel title="How should QA Copilot use AI?">
                <RadioGroup aria-label="AI mode" value={settings.aiMode} onChange={(v) => update({ aiMode: v as AiMode })}>
                    <RadioButton value="demo" label="Demo" hint="Built-in sample results. No key and no network calls. Best for trying the app." />
                    <RadioButton
                        value="byok"
                        label="Your API key"
                        hint="Calls Claude, OpenAI, Gemini, or any OpenAI-compatible endpoint directly from this browser with your own key. The key is stored only in this browser."
                    />
                    <RadioButton
                        value="prompt"
                        label="Prompt only"
                        hint="Builds the prompt for you to paste into any AI tool your organization approves, then formats the answer you paste back."
                    />
                </RadioGroup>
            </Panel>

            {settings.aiMode === "byok" && <ProviderSettings />}
        </div>
    );
};

const ProviderSettings = () => {
    const { settings, update } = useSettings();
    const info = providerInfo[settings.provider];
    const [models, setModels] = useState<{ status: "idle" | "loading" | "ok" | "error"; list: string[]; error?: string }>({ status: "idle", list: [] });

    // Each provider keeps its own key and model, so switching back and forth loses nothing.
    const switchProvider = (provider: AiProvider) => {
        if (provider === settings.provider) return;
        update({
            provider,
            apiKeys: { ...settings.apiKeys, [settings.provider]: settings.apiKey },
            models: { ...settings.models, [settings.provider]: settings.model },
            apiKey: settings.apiKeys[provider] ?? "",
            model: settings.models[provider] ?? defaultModels[provider],
        });
        setModels({ status: "idle", list: [] });
    };

    const load = async () => {
        setModels({ status: "loading", list: [] });
        try {
            const list = await listModels(settings);
            setModels({ status: "ok", list });
            if (list.length && !list.includes(settings.model)) update({ model: list[0] });
        } catch (e) {
            const err = e as Error;
            setModels({
                status: "error",
                list: [],
                error: err.name === "TimeoutError" ? "No answer after 20 seconds. Check your connection or VPN." : err.message,
            });
        }
    };

    return (
        <Panel title="Provider">
            <div className="flex flex-col gap-4">
                <Select
                    label="Provider"
                    items={(Object.keys(providerInfo) as AiProvider[]).map((id) => ({ id, label: providerInfo[id].label }))}
                    selectedKey={settings.provider}
                    onSelectionChange={(k) => k && switchProvider(k as AiProvider)}
                >
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>

                {settings.provider === "compatible" && (
                    <Input
                        label="Base URL"
                        value={settings.baseUrl}
                        onChange={(baseUrl) => update({ baseUrl })}
                        placeholder="https://openrouter.ai/api/v1"
                        hint="Any server that speaks the OpenAI Chat Completions API: OpenRouter, Groq, Together, Ollama (http://localhost:11434/v1), LM Studio, or your company's AI gateway. It must allow browser requests (CORS)."
                    />
                )}

                <Input
                    label={info.needsKey ? "API key" : "API key (optional)"}
                    type="password"
                    value={settings.apiKey}
                    onChange={(apiKey) => update({ apiKey })}
                    placeholder={info.keyPlaceholder}
                    hint="Stored only in this browser and sent only to this provider. Never included in exported settings."
                />
                {info.keyUrl && (
                    <p className="-mt-2 text-sm text-tertiary">
                        Need a key?{" "}
                        <a
                            href={info.keyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-brand-secondary underline-offset-2 hover:underline"
                        >
                            Get one from {info.label.replace(/ \(.*\)$/, "")}
                        </a>
                        .
                    </p>
                )}

                <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            {models.list.length ? (
                                <Select
                                    label="Model"
                                    items={[...new Set([settings.model, ...models.list])].filter(Boolean).map((id) => ({ id, label: id }))}
                                    selectedKey={settings.model}
                                    onSelectionChange={(k) => k && update({ model: String(k) })}
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            ) : (
                                <Input
                                    label="Model"
                                    value={settings.model}
                                    onChange={(model) => update({ model })}
                                    placeholder={defaultModels[settings.provider] || "model-id"}
                                />
                            )}
                        </div>
                        <Button color="secondary" iconLeading={RefreshCw01} isLoading={models.status === "loading"} onClick={load} data-testid="load-models">
                            Load models
                        </Button>
                    </div>
                    <p className="text-sm text-tertiary" data-testid="models-hint">
                        {models.status === "ok"
                            ? `${models.list.length} models available to this key.`
                            : "Which models you can use depends on your account, so Load models asks the provider for the exact list."}
                    </p>
                    {models.status === "error" && (
                        <p role="alert" className="text-sm text-error-primary">
                            {models.error}
                        </p>
                    )}
                    {models.status === "ok" && (
                        <button
                            type="button"
                            className="self-start text-sm font-semibold text-brand-secondary"
                            onClick={() => setModels({ status: "idle", list: [] })}
                        >
                            Type a model ID instead
                        </button>
                    )}
                </div>

                {(settings.apiKey || !info.needsKey) && <ConnectionCheck onRemove={() => update({ apiKey: "" })} />}
            </div>
        </Panel>
    );
};

/** Sends one tiny request so a bad key or model name shows up here, not mid-generation. */
const ConnectionCheck = ({ onRemove }: { onRemove: () => void }) => {
    const { settings } = useSettings();
    const [state, setState] = useState<{ status: "idle" | "checking" | "ok" | "error"; message?: string }>({ status: "idle" });
    const check = async () => {
        setState({ status: "checking" });
        try {
            setState({ status: "ok", message: await testConnection(settings) });
        } catch (e) {
            const err = e as Error;
            setState({ status: "error", message: err.name === "TimeoutError" ? "No answer after 20 seconds. Check your connection or VPN." : err.message });
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                <Button size="sm" color="secondary" iconLeading={Zap} isLoading={state.status === "checking"} onClick={check}>
                    Test connection
                </Button>
                <Button size="sm" color="secondary-destructive" onClick={onRemove}>
                    Remove key
                </Button>
            </div>
            {(state.status === "ok" || state.status === "error") && (
                <p
                    role="status"
                    data-testid="connection-result"
                    className={`flex items-start gap-2 rounded-lg p-3 text-sm ${state.status === "ok" ? "bg-success-primary text-success-primary" : "bg-error-primary text-error-primary"}`}
                >
                    {state.status === "ok" ? <CheckCircle className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                    {state.message}
                </p>
            )}
        </div>
    );
};

const ProjectSettings = () => {
    const { settings, update } = useSettings();
    const p = settings.project;
    const set = (patch: Partial<typeof p>) => update({ project: { ...p, ...patch } });

    return (
        <Panel title="Project profile">
            <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Project name" value={p.name} onChange={(name) => set({ name })} />
                    <Input label="Key prefix" value={p.keyPrefix} onChange={(keyPrefix) => set({ keyPrefix })} hint="Used for IDs like SHOP-TC-001" />
                </div>
                <ListInput label="Environments" value={p.environments} onChange={(environments) => set({ environments })} />
                <ListInput label="Browsers and devices" value={p.browsers} onChange={(browsers) => set({ browsers })} />
                <ListInput label="App areas" value={p.areas} onChange={(areas) => set({ areas })} />
                <TextArea
                    label="Team instructions for the AI"
                    rows={4}
                    value={p.instructions}
                    onChange={(instructions) => set({ instructions })}
                    placeholder="Use plain English. Always mention accessibility impact."
                />
            </div>
        </Panel>
    );
};

const formats: { id: OutputFormat; label: string }[] = [
    { id: "rich", label: "Rich text (Jira Cloud, Azure DevOps, Confluence)" },
    { id: "jira-wiki", label: "Jira wiki markup (Data Center / Server)" },
    { id: "markdown", label: "Markdown (GitHub, GitLab, Linear)" },
    { id: "plain", label: "Plain text" },
];

const TrackerSettings = () => {
    const { settings, update } = useSettings();
    const [editingId, setEditingId] = useState(settings.activeTrackerId);
    const tracker = settings.trackers.find((t) => t.id === editingId) ?? settings.trackers[0];

    const save = (next: TrackerProfile) => update({ trackers: settings.trackers.map((t) => (t.id === next.id ? next : t)) });
    const set = (patch: Partial<TrackerProfile>) => save({ ...tracker, ...patch });
    const setLabel = (key: keyof TrackerProfile["labels"], value: string) => set({ labels: { ...tracker.labels, [key]: value } });

    const duplicate = () => {
        const copy = { ...tracker, id: `custom-${Date.now()}`, name: `${tracker.name} (copy)` };
        update({ trackers: [...settings.trackers, copy] });
        setEditingId(copy.id);
    };
    const remove = () => {
        const rest = settings.trackers.filter((t) => t.id !== tracker.id);
        update({ trackers: rest, activeTrackerId: settings.activeTrackerId === tracker.id ? rest[0].id : settings.activeTrackerId });
        setEditingId(rest[0].id);
    };

    return (
        <div className="flex flex-col gap-6">
            <Panel
                title="Tracker profiles"
                actions={
                    <div className="flex gap-2">
                        <Button size="sm" color="secondary" iconLeading={Plus} onClick={duplicate}>
                            Duplicate
                        </Button>
                        <Button size="sm" color="secondary-destructive" iconLeading={Trash01} onClick={remove} isDisabled={settings.trackers.length < 2}>
                            Delete
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    <Select
                        label="Editing"
                        items={settings.trackers.map((t) => ({ id: t.id, label: t.name }))}
                        selectedKey={tracker.id}
                        onSelectionChange={(k) => k && setEditingId(String(k))}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                    <Input label="Name" value={tracker.name} onChange={(name) => set({ name })} />
                    <Select
                        label="Output format"
                        items={formats}
                        selectedKey={tracker.format}
                        onSelectionChange={(k) => k && set({ format: k as OutputFormat })}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                    <Input
                        label="Title pattern"
                        value={tracker.titlePattern}
                        onChange={(titlePattern) => set({ titlePattern })}
                        hint="Use {area} and {problem}"
                    />
                    <ListInput label="Severity scale" value={tracker.severityScale} onChange={(severityScale) => set({ severityScale })} />
                    <ListInput label="Priority scale" value={tracker.priorityScale} onChange={(priorityScale) => set({ priorityScale })} />
                    <ListInput
                        label="Custom fields"
                        value={tracker.customFields}
                        onChange={(customFields) => set({ customFields })}
                        hint="For example: Component, Sprint, Customer impact"
                    />
                </div>
            </Panel>

            <Panel title="Field labels">
                <div className="grid gap-4 sm:grid-cols-2">
                    {(Object.keys(tracker.labels) as (keyof TrackerProfile["labels"])[]).map((key) => (
                        <Input
                            key={key}
                            label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                            value={tracker.labels[key]}
                            onChange={(v) => setLabel(key, v)}
                        />
                    ))}
                </div>
            </Panel>

            <Panel title="Bug report style">
                <div className="flex flex-col gap-4">
                    <Select
                        label="Tone"
                        items={[
                            { id: "concise", label: "Concise" },
                            { id: "detailed", label: "Detailed" },
                        ]}
                        selectedKey={settings.bug.tone}
                        onSelectionChange={(k) => k && update({ bug: { ...settings.bug, tone: k as "concise" | "detailed" } })}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                    <Toggle
                        label="Include a possible cause"
                        isSelected={settings.bug.includePossibleCause}
                        onChange={(v) => update({ bug: { ...settings.bug, includePossibleCause: v } })}
                    />
                    <Toggle
                        label="Suggest a regression test"
                        isSelected={settings.bug.includeRegressionTest}
                        onChange={(v) => update({ bug: { ...settings.bug, includeRegressionTest: v } })}
                    />
                    <div>
                        <Button
                            size="sm"
                            color="link-gray"
                            iconLeading={RefreshCw01}
                            onClick={() => update({ trackers: defaultTrackers, activeTrackerId: defaultTrackers[0].id })}
                        >
                            Restore default trackers
                        </Button>
                    </div>
                </div>
            </Panel>
        </div>
    );
};

const TestGenSettingsPanel = () => {
    const { settings, update } = useSettings();
    const t = settings.testGen;
    const set = (patch: Partial<TestGenSettings>) => update({ testGen: { ...t, ...patch } });

    return (
        <div className="flex flex-col gap-6">
            <Panel title="Code style">
                <div className="flex flex-col gap-4">
                    <Select
                        label="Selector strategy"
                        items={[
                            { id: "role", label: "Accessible roles and labels first" },
                            { id: "test-id", label: "Test ID attribute" },
                        ]}
                        selectedKey={t.selectorStrategy}
                        onSelectionChange={(k) => k && set({ selectorStrategy: k as TestGenSettings["selectorStrategy"] })}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                    <Input
                        label="Test ID attribute"
                        value={t.testIdAttribute}
                        onChange={(testIdAttribute) => set({ testIdAttribute })}
                        hint="data-testid, data-cy, data-qa, or your own"
                    />
                    <Input
                        label="Test naming pattern"
                        value={t.namingPattern}
                        onChange={(namingPattern) => set({ namingPattern })}
                        hint="For example: should {behavior}"
                    />
                    <ListInput label="Tags" value={t.tags} onChange={(tags) => set({ tags })} hint="For example: @smoke, @regression" />
                    <Toggle label="Use the Page Object Model" isSelected={t.pageObjects} onChange={(pageObjects) => set({ pageObjects })} />
                </div>
            </Panel>
            <Panel title="Match your team's style">
                <TextArea
                    label="Style sample"
                    hint="Paste one real test from your codebase. Generated code will follow its structure and conventions. Remove anything sensitive first."
                    rows={8}
                    value={t.styleSample}
                    onChange={(styleSample) => set({ styleSample })}
                    textAreaClassName="font-mono text-sm"
                />
            </Panel>
        </div>
    );
};

const PrivacySettings = () => {
    const { settings, update } = useSettings();
    const r = settings.redaction;
    const [sample, setSample] = useState("Reach jane.doe@example.com at 703-555-0142 from 10.0.4.12, record 123456789.");
    const preview = redact(sample, r.customTerms);

    return (
        <div className="flex flex-col gap-6">
            <Panel title="Redaction">
                <div className="flex flex-col gap-4">
                    <Toggle
                        label="Mask sensitive values before building prompts"
                        hint="Emails, SSNs, phone numbers, IP addresses, URLs, long tokens, and long ID numbers."
                        isSelected={r.enabled}
                        onChange={(enabled) => update({ redaction: { ...r, enabled } })}
                    />
                    <ListInput
                        label="Also mask these words"
                        hint="Internal hostnames, project code names, customer names. Separate with commas."
                        value={r.customTerms}
                        onChange={(customTerms) => update({ redaction: { ...r, customTerms } })}
                    />
                </div>
            </Panel>
            <Panel title="Try it">
                <div className="flex flex-col gap-3">
                    <TextArea aria-label="Redaction sample" rows={3} value={sample} onChange={setSample} />
                    <pre className="rounded-lg bg-secondary p-3 font-mono text-xs whitespace-pre-wrap text-secondary">{preview.text}</pre>
                </div>
            </Panel>
            <p className="text-sm text-tertiary">
                Redaction reduces risk but can't catch everything. Follow your organization's rules about which AI tools can see work data.
            </p>
        </div>
    );
};

const BackupSettings = () => {
    const { settings, replace, reset } = useSettings();
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const onImport = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        try {
            replace(parseImportedSettings(await file.text(), settings));
            setMessage({ ok: true, text: `Imported settings from ${file.name}.` });
        } catch (e) {
            setMessage({ ok: false, text: (e as Error).message });
        }
    };

    return (
        <Panel title="Share settings with your team">
            <div className="flex flex-col gap-4">
                <p className="text-md text-tertiary">
                    Exports include your project profile, trackers, and test generation settings. Your API key is never exported.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button color="secondary" iconLeading={Download01} onClick={() => exportSettings(settings)}>
                        Export settings
                    </Button>
                    <FileTrigger acceptedFileTypes={["application/json"]} onSelect={onImport}>
                        <Button color="secondary" iconLeading={Upload01}>
                            Import settings
                        </Button>
                    </FileTrigger>
                    <Button color="secondary-destructive" onClick={reset}>
                        Reset everything
                    </Button>
                </div>
                {message && <p className={message.ok ? "text-sm text-success-primary" : "text-sm text-error-primary"}>{message.text}</p>}
            </div>
        </Panel>
    );
};
