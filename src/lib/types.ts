export type AiMode = "demo" | "byok" | "prompt";
export type AiProvider = "anthropic" | "openai" | "gemini" | "compatible";
export type OutputFormat = "rich" | "jira-wiki" | "markdown" | "plain";
export type Framework = "playwright" | "cypress" | "selenium" | "webdriverio";
export type Language = "typescript" | "javascript" | "python" | "java" | "csharp";

/** What a piece of generated code targets. */
export interface CodeTarget {
    framework: Framework;
    language: Language;
    /** Cucumber/BDD: feature file + step definitions instead of plain specs. */
    bdd: boolean;
}

export interface GeneratedFile {
    path: string;
    content: string;
}
export type TestType = "happy" | "negative" | "edge" | "accessibility" | "api";
export type BugSource = "manual" | "playwright" | "cypress" | "selenium" | "support" | "other";

export interface ProjectProfile {
    name: string;
    keyPrefix: string;
    environments: string[];
    browsers: string[];
    areas: string[];
    instructions: string;
}

export interface TrackerProfile {
    id: string;
    name: string;
    format: OutputFormat;
    severityScale: string[];
    priorityScale: string[];
    titlePattern: string;
    labels: {
        summary: string;
        steps: string;
        expected: string;
        actual: string;
        environment: string;
        severity: string;
        priority: string;
        possibleCause: string;
        regressionTest: string;
    };
    customFields: string[];
}

export interface TestGenSettings {
    framework: Framework;
    language: Language;
    bdd: boolean;
    selectorStrategy: "role" | "test-id";
    testIdAttribute: string;
    pageObjects: boolean;
    namingPattern: string;
    tags: string[];
    caseCount: number;
    testTypes: TestType[];
    styleSample: string;
}

export interface BugSettings {
    tone: "concise" | "detailed";
    includePossibleCause: boolean;
    includeRegressionTest: boolean;
}

export interface Settings {
    version: 1;
    aiMode: AiMode;
    provider: AiProvider;
    /** Key and model for the active provider. Other providers' values are kept in apiKeys/models. */
    apiKey: string;
    model: string;
    apiKeys: Partial<Record<AiProvider, string>>;
    models: Partial<Record<AiProvider, string>>;
    /** Base URL for OpenAI-compatible endpoints (OpenRouter, Ollama, LM Studio, a company gateway). */
    baseUrl: string;
    project: ProjectProfile;
    redaction: { enabled: boolean; customTerms: string[] };
    trackers: TrackerProfile[];
    activeTrackerId: string;
    testGen: TestGenSettings;
    bug: BugSettings;
}

export interface BugReport {
    title: string;
    summary: string;
    steps: string[];
    expected: string;
    actual: string;
    environment: string;
    severity: string;
    priority: string;
    possibleCause?: string;
    regressionTest?: string;
    customFields?: Record<string, string>;
}

export interface TestCase {
    id: string;
    title: string;
    type: TestType;
    priority: "high" | "medium" | "low";
    preconditions?: string;
    steps: string[];
    expected: string;
}

export interface TestGenResult {
    assumptions: string[];
    cases: TestCase[];
    /** Automation files (spec files, or feature + step definitions + support for BDD). */
    files: GeneratedFile[];
}
