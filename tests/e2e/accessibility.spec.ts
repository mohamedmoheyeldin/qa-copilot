import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated WCAG 2.1 AA scan of every page, in both themes. Catches regressions; it doesn't replace a manual check.
const pages = [
    { name: "Dashboard", path: "/#/" },
    { name: "Bug report writer", path: "/#/bug-report" },
    { name: "Test case generator", path: "/#/test-cases" },
    { name: "History", path: "/#/history" },
    { name: "Settings", path: "/#/settings" },
];

for (const theme of ["light", "dark"] as const) {
    for (const p of pages) {
        test(`${p.name} has no serious accessibility issues (${theme})`, async ({ page }) => {
            await page.addInitScript((t) => localStorage.setItem("ui-theme", t), theme);
            await page.goto(p.path);
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

            const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
            const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
            expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
        });
    }
}

test("dashboard with data passes in both themes", async ({ page }) => {
    for (const theme of ["light", "dark"]) {
        await page.addInitScript((t) => localStorage.setItem("ui-theme", t), theme);
        await page.goto("/#/");
        await page
            .getByTestId("load-sample-data")
            .click({ timeout: 5000 })
            .catch(() => undefined);
        await expect(page.getByTestId("kpi-bug-reports")).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(
            violations
                .filter((v) => v.impact === "serious" || v.impact === "critical")
                .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        ).toEqual([]);
    }
});

for (const theme of ["light", "dark"] as const) {
    test(`results, code, and change notices pass after generating (${theme})`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("ui-theme", t), theme);
        await page.addInitScript(() => localStorage.setItem("qa-copilot:settings", JSON.stringify({ aiMode: "prompt" })));
        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();
        await page.getByRole("button", { name: "Copy prompt" }).waitFor();
        const { demoTestResult } = await import("../../src/lib/demo-data");
        await page.getByLabel("AI response").fill(JSON.stringify(demoTestResult));
        await page.getByRole("button", { name: "Format answer" }).click();
        await expect(page.getByTestId("test-case-table")).toBeVisible();
        const scan = async () => {
            const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
            return violations
                .filter((v) => v.impact === "serious" || v.impact === "critical")
                .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
        };
        expect(await scan()).toEqual([]);
        await page.getByRole("tab", { name: /^Code/ }).click();
        await page
            .getByRole("button", { name: /Framework/ })
            .first()
            .click();
        await page.getByRole("option", { name: "Selenium", exact: true }).click();
        await expect(page.getByTestId("stale-code-notice")).toBeVisible();
        expect(await scan()).toEqual([]);
    });
}

test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/#/bug-report");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
});
