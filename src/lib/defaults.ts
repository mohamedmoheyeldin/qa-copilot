import type { AiProvider, Settings, TrackerProfile } from "./types";

const standardLabels: TrackerProfile["labels"] = {
    summary: "Summary",
    steps: "Steps to Reproduce",
    expected: "Expected Result",
    actual: "Actual Result",
    environment: "Environment",
    severity: "Severity",
    priority: "Priority",
    possibleCause: "Possible Cause",
    regressionTest: "Suggested Regression Test",
};

export const defaultTrackers: TrackerProfile[] = [
    {
        id: "jira-cloud",
        name: "Jira Cloud",
        format: "rich",
        severityScale: ["Blocker", "Critical", "Major", "Minor", "Trivial"],
        priorityScale: ["Highest", "High", "Medium", "Low", "Lowest"],
        titlePattern: "[{area}] {problem}",
        labels: standardLabels,
        customFields: ["Component", "Labels"],
    },
    {
        id: "jira-dc",
        name: "Jira Data Center / Server",
        format: "jira-wiki",
        severityScale: ["Blocker", "Critical", "Major", "Minor", "Trivial"],
        priorityScale: ["Highest", "High", "Medium", "Low", "Lowest"],
        titlePattern: "[{area}] {problem}",
        labels: standardLabels,
        customFields: ["Component", "Fix Version"],
    },
    {
        id: "azure-devops",
        name: "Azure DevOps",
        format: "rich",
        severityScale: ["1 - Critical", "2 - High", "3 - Medium", "4 - Low"],
        priorityScale: ["1", "2", "3", "4"],
        titlePattern: "{area}: {problem}",
        labels: { ...standardLabels, steps: "Repro Steps", expected: "Expected", actual: "Actual", environment: "System Info" },
        customFields: ["Area Path", "Iteration"],
    },
    {
        id: "github",
        name: "GitHub Issues",
        format: "markdown",
        severityScale: ["Critical", "High", "Medium", "Low"],
        priorityScale: ["P0", "P1", "P2", "P3"],
        titlePattern: "{area}: {problem}",
        labels: standardLabels,
        customFields: [],
    },
];

/**
 * Starting model per provider. These are only defaults: Settings > Load models lists exactly
 * what the user's key can access, since availability depends on the account, not on this app.
 */
export const defaultModels: Record<AiProvider, string> = {
    anthropic: "claude-sonnet-5-5",
    openai: "gpt-5-mini",
    gemini: "gemini-2.5-flash",
    compatible: "",
};

export const defaultSettings: Settings = {
    version: 1,
    aiMode: "demo",
    provider: "anthropic",
    apiKey: "",
    model: defaultModels.anthropic,
    apiKeys: {},
    models: {},
    baseUrl: "",
    project: {
        name: "Acme Shop",
        keyPrefix: "SHOP",
        environments: ["dev", "staging", "prod"],
        browsers: ["Chrome", "Safari", "Firefox"],
        areas: ["Login", "Cart", "Checkout", "Profile"],
        instructions: "",
    },
    redaction: { enabled: true, customTerms: [] },
    trackers: defaultTrackers,
    activeTrackerId: "jira-cloud",
    testGen: {
        framework: "playwright",
        language: "typescript",
        bdd: false,
        selectorStrategy: "role",
        testIdAttribute: "data-testid",
        pageObjects: false,
        namingPattern: "should {behavior}",
        tags: ["@regression"],
        caseCount: 6,
        testTypes: ["happy", "negative", "edge"],
        styleSample: "",
    },
    bug: {
        tone: "concise",
        includePossibleCause: true,
        includeRegressionTest: true,
    },
};
