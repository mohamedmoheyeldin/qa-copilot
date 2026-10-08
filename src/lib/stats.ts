import { describeTarget } from "./frameworks";
import type { HistoryEntry } from "./history";
import type { TestType } from "./types";

/** Rough minutes saved per item, shown with the assumption so the number is honest. */
export const MINUTES_SAVED = { bugReport: 15, testCase: 6, automationFile: 20 };

export interface DashboardStats {
    bugReports: number;
    testSuites: number;
    testCases: number;
    automationFiles: number;
    hoursSaved: number;
    activity: { date: string; label: string; bugs: number; tests: number }[];
    casesByType: { type: TestType; count: number }[];
    casesByPriority: { priority: "high" | "medium" | "low"; count: number }[];
    bugsBySeverity: { severity: string; count: number }[];
    targets: { label: string; count: number }[];
    modes: { mode: HistoryEntry["mode"]; count: number }[];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const countBy = <K extends string>(items: K[]) => {
    const map = new Map<K, number>();
    for (const i of items) map.set(i, (map.get(i) ?? 0) + 1);
    return map;
};

/** Pure summary of history for the dashboard. `now` is injectable for tests. */
export const computeStats = (entries: HistoryEntry[], days = 14, now = new Date()): DashboardStats => {
    const bugs = entries.filter((e) => e.tool === "bug");
    const tests = entries.filter((e) => e.tool === "tests");
    const cases = tests.flatMap((e) => e.result.cases);
    const automationFiles = tests.reduce((n, e) => n + e.result.files.filter((f) => f.path !== "README.md").length, 0);

    const activity = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1 - i));
        return { date: dayKey(d), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), bugs: 0, tests: 0 };
    });
    const byDay = new Map(activity.map((a) => [a.date, a]));
    for (const e of entries) {
        const slot = byDay.get(dayKey(new Date(e.createdAt)));
        if (slot) slot[e.tool === "bug" ? "bugs" : "tests"]++;
    }

    const typeOrder: TestType[] = ["happy", "negative", "edge", "accessibility", "api"];
    const types = countBy(cases.map((c) => c.type));
    const priorities = countBy(cases.map((c) => c.priority));
    const severities = countBy(bugs.map((b) => b.result.severity || "Not set"));
    const targets = countBy(tests.map((t) => describeTarget(t.meta)));
    const modes = countBy(entries.map((e) => e.mode));

    return {
        bugReports: bugs.length,
        testSuites: tests.length,
        testCases: cases.length,
        automationFiles,
        hoursSaved:
            Math.round(
                ((bugs.length * MINUTES_SAVED.bugReport + cases.length * MINUTES_SAVED.testCase + automationFiles * MINUTES_SAVED.automationFile) / 60) * 10,
            ) / 10,
        activity,
        casesByType: typeOrder.map((type) => ({ type, count: types.get(type) ?? 0 })).filter((t) => t.count),
        casesByPriority: (["high", "medium", "low"] as const).map((priority) => ({ priority, count: priorities.get(priority) ?? 0 })),
        bugsBySeverity: [...severities].map(([severity, count]) => ({ severity, count })).sort((a, b) => b.count - a.count),
        targets: [...targets].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
        modes: [...modes].map(([mode, count]) => ({ mode, count })),
    };
};
