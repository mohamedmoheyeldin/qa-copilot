import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { demoTestResult } from "../demo-data";
import { frameworkIds, languagesFor } from "../frameworks";
import type { CodeTarget } from "../types";
import { toAction, toAssertion } from "./actions";
import { buildFeature, gherkinText, scaffold } from "./index";

const opts = { name: "Password reset", tags: ["@regression"], selectors: { strategy: "role" as const, testIdAttribute: "data-testid" } };
const targets: CodeTarget[] = frameworkIds.flatMap((framework) =>
    languagesFor(framework).flatMap((language) => [false, true].map((bdd) => ({ framework, language, bdd }))),
);

const hasPython = (() => {
    try {
        execFileSync("python3", ["--version"]);
        return true;
    } catch {
        return false;
    }
})();

describe("scaffold", () => {
    it("covers every framework, language, and BDD combination", () => {
        expect(targets).toHaveLength(28);
    });

    it.each(targets.map((t) => [`${t.framework} ${t.language}${t.bdd ? " bdd" : ""}`, t] as const))("%s produces syntactically valid files", (_, target) => {
        const files = scaffold(demoTestResult.cases, target, opts);
        expect(files.length).toBeGreaterThan(1);
        expect(files.at(-1)?.path).toBe("README.md");
        expect(new Set(files.map((f) => f.path)).size).toBe(files.length);

        for (const f of files) {
            expect(f.content.trim().length, f.path).toBeGreaterThan(0);
            if (/\.(ts|js)$/.test(f.path)) {
                const out = ts.transpileModule(f.content, { reportDiagnostics: true, fileName: f.path, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
                expect(
                    out.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")),
                    f.path,
                ).toEqual([]);
            }
            if (/\.(java|cs)$/.test(f.path)) {
                // Brace and paren balance catches the most likely template mistakes in languages we can't compile here.
                const code = f.content.replace(/"(?:\\.|[^"\\])*"/g, '""');
                for (const [open, close] of [
                    ["{", "}"],
                    ["(", ")"],
                ])
                    expect(code.split(open).length, `${f.path} ${open}${close}`).toBe(code.split(close).length);
            }
            if (f.path.endsWith(".py") && hasPython) {
                const dir = mkdtempSync(join(tmpdir(), "qa-py-"));
                const file = join(dir, "check.py");
                writeFileSync(file, f.content);
                expect(() => execFileSync("python3", ["-m", "py_compile", file], { stdio: "pipe" }), f.path).not.toThrow();
            }
        }
    });

    it.each(targets.filter((t) => t.bdd).map((t) => [`${t.framework} ${t.language}`, t] as const))(
        "%s step definitions cover every feature step",
        (_, target) => {
            const files = scaffold(demoTestResult.cases, target, opts);
            const feature = files.find((f) => f.path.endsWith(".feature"))!.content;
            const steps = feature
                .split("\n")
                .map((l) => l.trim().match(/^(?:Given|When|Then|And|But) (.+)$/)?.[1])
                .filter(Boolean) as string[];
            const code = files
                .filter((f) => !f.path.endsWith(".feature") && f.path !== "README.md")
                .map((f) => f.content)
                .join("\n");
            for (const step of new Set(steps)) {
                const escaped = step.replace(/([(){}/\\])/g, "\\$1");
                const asWritten = [step, escaped, escaped.replace(/\\/g, "\\\\"), step.replace(/{/g, "{{").replace(/}/g, "}}")];
                expect(
                    asWritten.some((s) => code.includes(JSON.stringify(s).slice(1, -1))),
                    `missing step: ${step}`,
                ).toBe(true);
            }
        },
    );
});

describe("step interpretation", () => {
    it("maps common steps to actions", () => {
        expect(toAction("Open the login page")).toEqual({ kind: "goto", path: "/login" });
        expect(toAction('Click "Forgot password"')).toMatchObject({ kind: "click", name: "Forgot password" });
        expect(toAction("Click the Pay now button")).toMatchObject({ kind: "click", name: "Pay now", role: "button" });
        expect(toAction("Enter the registered email")).toMatchObject({ kind: "fill", field: "Email", value: "registered.user@example.com" });
        expect(toAction("Enter 'not-an-email'")).toMatchObject({ kind: "fill", field: "Email", value: "not-an-email" });
        expect(toAction("Open the expired reset link")).toMatchObject({ kind: "todo" });
    });

    it("keeps a confirmed password equal to the one entered", () => {
        const state = {};
        const first = toAction("Enter a 12+ character password", state);
        const confirm = toAction("Confirm the password", state);
        expect(first).toMatchObject({ kind: "fill", field: "Password" });
        expect(confirm).toMatchObject({ kind: "fill", field: "Confirm password", value: (first as { value: string }).value });
        expect((first as { value: string }).value).toHaveLength(12);
    });

    it("only asserts what the expected result clearly states", () => {
        expect(toAssertion('A "Check your email" message is shown')).toEqual({ kind: "expectText", text: "Check your email" });
        expect(toAssertion("A validation error explains the minimum")).toEqual({ kind: "expectAlert" });
        expect(toAssertion("Password is updated")).toMatchObject({ kind: "todo" });
    });

    it("writes natural Gherkin", () => {
        expect(gherkinText("Click Forgot password")).toBe("I click Forgot password");
        expect(gherkinText("A registered user exists")).toBe("a registered user exists");
        expect(gherkinText("API returns 200.")).toBe("API returns 200");
    });

    it("defines each repeated step once", () => {
        const { steps } = buildFeature([...demoTestResult.cases, ...demoTestResult.cases], "Dupes", []);
        expect(new Set(steps.map((s) => s.text)).size).toBe(steps.length);
    });
});
