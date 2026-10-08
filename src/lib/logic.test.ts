import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAi, listModels } from "./ai/client";
import { normalizeTestResult, parseWith, testGenSchema } from "./ai/parse";
import { defaultSettings } from "./defaults";
import { defaultTrackers } from "./defaults";
import { demoTestResult } from "./demo-data";
import { bugToDoc, casesToDoc, docToMarkdown } from "./export/model";
import { describeTarget, languagesFor, normalizeTarget } from "./frameworks";
import { normalizeEntry } from "./history";
import { redact } from "./redact";
import { buildSampleHistory } from "./sample-history";
import { computeStats } from "./stats";
import type { Settings } from "./types";

describe("frameworks", () => {
    it("keeps languages valid for the framework", () => {
        expect(normalizeTarget({ framework: "cypress", language: "java", bdd: true })).toEqual({ framework: "cypress", language: "typescript", bdd: true });
        expect(normalizeTarget({ framework: "selenium", language: "csharp", bdd: false }).language).toBe("csharp");
        expect(languagesFor("playwright")).toEqual(["typescript", "javascript", "python", "java", "csharp"]);
        expect(describeTarget({ framework: "selenium", language: "python", bdd: true })).toBe("Selenium, Python, behave");
    });
});

describe("AI response parsing", () => {
    it("accepts the files shape and the older single code string", () => {
        const withFiles = parseWith(testGenSchema, JSON.stringify({ cases: [], files: [{ path: "a.spec.ts", content: "x" }] }));
        expect(withFiles.files).toHaveLength(1);
        const legacy = parseWith(testGenSchema, "```json\n" + JSON.stringify({ cases: [], code: "test()" }) + "\n```");
        expect(legacy.files).toEqual([{ path: "generated.spec.ts", content: "test()" }]);
        expect(normalizeTestResult({ files: [], code: undefined }).files).toEqual([]);
    });

    it("explains cut-off and malformed JSON", () => {
        expect(() => parseWith(testGenSchema, '{"cases": [')).toThrow(/cut off|syntax/);
        expect(() => parseWith(testGenSchema, "no json here")).toThrow(/doesn't contain a JSON object/);
        expect(() => parseWith(testGenSchema, '{"cases": "nope"}')).toThrow(/cases/);
    });
});

describe("history upgrades", () => {
    it("converts old single-file entries and drops garbage", () => {
        const old = {
            id: "1",
            tool: "tests",
            createdAt: "2026-01-01T00:00:00Z",
            title: "t",
            input: "i",
            mode: "demo",
            meta: { framework: "cypress", language: "typescript" },
            result: { assumptions: [], cases: [], code: "cy.visit()" },
        };
        const e = normalizeEntry(old)!;
        expect(e.tool === "tests" && e.result.files[0]).toEqual({ path: "generated.cy.ts", content: "cy.visit()" });
        expect(e.tool === "tests" && e.meta.bdd).toBe(false);
        expect(normalizeEntry({ nope: true })).toBeNull();
        expect(normalizeEntry(null)).toBeNull();
    });
});

describe("dashboard stats", () => {
    const now = new Date("2026-10-07T12:00:00");
    const entries = buildSampleHistory(now);

    it("counts everything and buckets activity by day", () => {
        const s = computeStats(entries, 14, now);
        expect(s.bugReports + s.testSuites).toBe(entries.length);
        expect(s.activity).toHaveLength(14);
        expect(s.activity.reduce((n, d) => n + d.bugs + d.tests, 0)).toBe(entries.length);
        expect(s.testCases).toBe(s.casesByType.reduce((n, t) => n + t.count, 0));
        expect(s.casesByPriority.reduce((n, p) => n + p.count, 0)).toBe(s.testCases);
        expect(s.hoursSaved).toBeGreaterThan(0);
        expect(s.targets.length).toBeGreaterThan(2);
    });

    it("is all zeros for empty history", () => {
        const s = computeStats([], 14, now);
        expect([s.bugReports, s.testCases, s.automationFiles, s.hoursSaved]).toEqual([0, 0, 0, 0]);
    });

    it("marks every sample entry so it can be removed", () => {
        expect(entries.every((e) => e.sample)).toBe(true);
    });
});

describe("exports", () => {
    it("builds a Markdown bug report with tracker labels", () => {
        const md = docToMarkdown(
            bugToDoc(
                { title: "Bug", summary: "S", steps: ["a", "b"], expected: "E", actual: "A", environment: "staging", severity: "Major", priority: "High" },
                defaultTrackers[0],
            ),
        );
        expect(md).toContain("# Bug");
        expect(md).toContain("1. a\n2. b");
        expect(md).toContain("**Severity:** Major");
    });

    it("includes cases and every code file in the test export", () => {
        const doc = casesToDoc("Reset", demoTestResult.cases, ["x"], [{ path: "f.feature", content: "Feature: x" }], {
            framework: "selenium",
            language: "java",
            bdd: true,
        });
        const md = docToMarkdown(doc);
        expect(md).toContain("| SHOP-TC-001 |");
        expect(md).toContain("```gherkin");
        expect(doc.meta.find(([k]) => k === "Automation")?.[1]).toContain("Cucumber JVM");
    });
});

describe("redaction", () => {
    it("masks sensitive values and custom terms", () => {
        const { text, count } = redact("Email jane@va.example.gov from 10.0.0.12 about Project Falcon", ["Project Falcon"]);
        expect(text).not.toContain("jane@va.example.gov");
        expect(text).not.toContain("10.0.0.12");
        expect(text).not.toContain("Project Falcon");
        expect(count).toBeGreaterThanOrEqual(3);
    });
});

describe("AI providers", () => {
    const base: Settings = { ...defaultSettings, aiMode: "byok", apiKey: "k", model: "m" };
    const reply = (body: unknown, status = 200) =>
        Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
    let fetchMock: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("calls Gemini with the key header and JSON output", async () => {
        fetchMock.mockReturnValue(reply({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" }] }));
        const out = await callAi({ system: "s", user: "u" }, { ...base, provider: "gemini", model: "gemini-x" });
        expect(out).toBe('{"ok":true}');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain("/models/gemini-x:generateContent");
        expect(init.headers["x-goog-api-key"]).toBe("k");
        expect(JSON.parse(init.body).generationConfig.responseMimeType).toBe("application/json");
    });

    it("uses the base URL for OpenAI-compatible endpoints and works without a key", async () => {
        fetchMock.mockReturnValue(reply({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }));
        await callAi({ system: "s", user: "u" }, { ...base, provider: "compatible", apiKey: "", baseUrl: "http://localhost:11434/v1/" });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("http://localhost:11434/v1/chat/completions");
        expect(init.headers.authorization).toBeUndefined();
        expect(JSON.parse(init.body).response_format).toBeUndefined();
    });

    it("lists only chat models, newest first", async () => {
        fetchMock.mockReturnValue(
            reply({
                data: [
                    { id: "gpt-old", created: 1 },
                    { id: "text-embedding-3-large", created: 5 },
                    { id: "gpt-new", created: 9 },
                ],
            }),
        );
        expect(await listModels({ ...base, provider: "openai" })).toEqual(["gpt-new", "gpt-old"]);
    });

    it("explains a wrong model name", async () => {
        fetchMock.mockReturnValue(reply({ error: { message: "not found" } }, 404));
        await expect(callAi({ system: "s", user: "u" }, { ...base, provider: "anthropic" })).rejects.toThrow(/doesn't recognize the model "m"/);
    });

    it("refuses to call without a model", async () => {
        await expect(callAi({ system: "s", user: "u" }, { ...base, model: " " })).rejects.toThrow(/Choose a model/);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
