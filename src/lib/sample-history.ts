import { scaffold } from "./codegen";
import { demoBugReport, demoCouponResult, demoManualBugReport, demoTestResult, testSamples } from "./demo-data";
import type { HistoryEntry } from "./history";
import type { BugReport, CodeTarget, TestGenResult } from "./types";

/**
 * Two weeks of realistic, clearly fictional activity so the dashboard has something to show
 * in a demo. Every entry is marked `sample` and can be removed in one click.
 */

const bugVariants: Partial<BugReport>[] = [
    {},
    { title: "[Cart] Quantity resets to 1 after page refresh", severity: "Major", priority: "Medium", environment: "staging, Chrome 129" },
    { title: "[Login] Error message overlaps the password field on mobile", severity: "Minor", priority: "Low", environment: "staging, iOS Safari" },
    { title: "[Profile] Saving an address with an apartment number fails", severity: "Major", priority: "High", environment: "dev, Firefox" },
    { title: "[Checkout] Order total ignores the shipping discount", severity: "Critical", priority: "Highest", environment: "prod, all browsers" },
    { title: "[Search] Results flicker while typing quickly", severity: "Trivial", priority: "Lowest", environment: "staging, Chrome" },
    { title: "[Login] Remember me doesn't persist after closing the browser", severity: "Major", priority: "Medium", environment: "staging, Edge" },
];

const targets: CodeTarget[] = [
    { framework: "playwright", language: "typescript", bdd: false },
    { framework: "cypress", language: "typescript", bdd: true },
    { framework: "selenium", language: "java", bdd: true },
    { framework: "playwright", language: "python", bdd: false },
    { framework: "webdriverio", language: "typescript", bdd: false },
    { framework: "selenium", language: "csharp", bdd: false },
];

const at = (now: Date, daysAgo: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, (daysAgo * 17) % 60, 0, 0);
    return d.toISOString();
};

export const buildSampleHistory = (now = new Date()): HistoryEntry[] => {
    const entries: HistoryEntry[] = [];
    const plan = [0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 9, 10, 11, 12, 13];

    plan.forEach((daysAgo, i) => {
        const createdAt = at(now, daysAgo, 9 + (i % 8));
        if (i % 2 === 0) {
            const base = i % 4 === 0 ? demoBugReport : demoManualBugReport;
            const result = { ...base, ...bugVariants[(i / 2) % bugVariants.length] };
            entries.push({
                id: `sample-bug-${i}`,
                tool: "bug",
                sample: true,
                createdAt,
                mode: i % 3 ? "prompt" : "byok",
                title: result.title,
                input: "(sample data)",
                result,
                meta: { source: "manual", trackerId: "jira-cloud" },
            });
        } else {
            const sample = i % 3 === 0 ? testSamples[1] : testSamples[0];
            const source: TestGenResult = sample.id === "coupon" ? demoCouponResult : demoTestResult;
            const meta = targets[((i - 1) / 2) % targets.length];
            const name = sample.label;
            const files = scaffold(source.cases, meta, { name, tags: ["@regression"], selectors: { strategy: "role", testIdAttribute: "data-testid" } });
            entries.push({
                id: `sample-tests-${i}`,
                tool: "tests",
                sample: true,
                createdAt,
                mode: i % 3 ? "prompt" : "byok",
                title: name,
                input: sample.input,
                result: { ...source, files },
                meta,
            });
        }
    });
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
