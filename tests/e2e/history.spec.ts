import { expect, test } from "@playwright/test";

test.describe("History", () => {
    test("saves results, reopens them, and keeps edits", async ({ page }) => {
        await page.goto("/#/history");
        await expect(page.getByText("Nothing saved yet")).toBeVisible();

        // Generate one bug report and one test suite.
        await page.goto("/#/bug-report");
        await page.getByRole("button", { name: "Manual notes" }).click();
        await page.getByTestId("generate-bug-report").click();
        await expect(page.getByTestId("bug-report-preview")).toBeVisible();

        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();
        await expect(page.getByTestId("test-case-table")).toBeVisible();

        // Both show up, newest first, and survive a reload.
        await page.goto("/#/history");
        await page.reload();
        const items = page.getByTestId("history-list").getByRole("listitem");
        await expect(items).toHaveCount(2);
        await expect(items.first()).toContainText("Test cases");

        // Filter and search narrow the list.
        await page
            .getByRole("radio", { name: "Bug reports" })
            .or(page.getByRole("button", { name: "Bug reports" }))
            .first()
            .click();
        await expect(items).toHaveCount(1);
        await page
            .getByRole("radio", { name: "All" })
            .or(page.getByRole("button", { name: "All", exact: true }))
            .first()
            .click();
        await page.getByLabel("Search history").fill("no such thing");
        await expect(page.getByText("No results match.")).toBeVisible();
        await page.getByLabel("Search history").fill("");

        // Reopen the bug report, edit the title, and confirm history picked up the edit.
        await page.getByTestId("history-list").getByRole("button").filter({ hasText: "Bug report" }).first().click();
        await expect(page).toHaveURL(/#\/bug-report$/);
        await expect(page.getByTestId("history-notice")).toBeVisible();
        await page.getByRole("tab", { name: "Edit" }).click();
        await page.getByLabel("Title").fill("Edited from history");
        await page.goto("/#/history");
        await expect(page.getByText("Edited from history")).toBeVisible();

        // The dashboard shows recent items and counts too.
        await page.goto("/#/");
        await expect(page.getByRole("region", { name: "Recent" })).toBeVisible();
        await expect(page.getByTestId("kpi-bug-reports")).toContainText("1");

        // Back up, clear, and restore.
        await page.goto("/#/history");
        const backup = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export" }).click();
        const file = await (await backup).path();

        // Clearing needs a confirmation.
        await page.getByRole("button", { name: "Clear history" }).click();
        await page.getByRole("button", { name: "Delete all 2" }).click();
        await expect(page.getByText("Nothing saved yet")).toBeVisible();
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: "Import" }).click();
        await (await chooser).setFiles(file);
        await expect(page.getByRole("status")).toContainText("Imported 2 entries");
        await expect(page.getByTestId("history-list").getByRole("listitem")).toHaveCount(2);
    });

    test("stores the redacted input, never the raw one", async ({ page }) => {
        await page.goto("/#/bug-report");
        await page.getByLabel("What happened?").fill("Login fails for jane.doe@va.example.gov on staging");
        await page.getByTestId("generate-bug-report").click();
        await expect(page.getByTestId("bug-report-preview")).toBeVisible();

        const stored = await page.evaluate(() => localStorage.getItem("qa-copilot:history") ?? "");
        expect(stored).not.toContain("jane.doe@va.example.gov");
    });
});
