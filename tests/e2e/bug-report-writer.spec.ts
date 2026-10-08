import { expect, test } from "@playwright/test";

test.describe("Bug report writer (demo mode)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/#/bug-report");
    });

    test("generates a report from a sample", async ({ page }) => {
        await page.getByRole("button", { name: "Playwright failure" }).click();
        await page.getByTestId("generate-bug-report").click();

        const preview = page.getByTestId("bug-report-preview");
        await expect(preview).toBeVisible();
        await expect(preview.getByRole("heading", { level: 2 })).toContainText("Pay now");
        await expect(preview.getByText("Steps to Reproduce")).toBeVisible();
    });

    test("copies the report for the selected tracker", async ({ page }) => {
        await page.getByRole("button", { name: "Manual notes" }).click();
        await page.getByTestId("generate-bug-report").click();
        await page.getByTestId("copy-primary").click();
        await expect(page.getByTestId("copy-primary")).toHaveText(/Copied/);
    });

    test("masks sensitive values before building the prompt", async ({ page }) => {
        await page.getByLabel("What happened?").fill("User jane.doe@example.com saw an error at 10.0.0.1");
        await page.getByTestId("generate-bug-report").click();
        await expect(page.getByText(/Masked 2 sensitive values/)).toBeVisible();
    });
});

test("a bug report hands off to the test case generator", async ({ page }) => {
    await page.goto("/#/bug-report");
    await page.getByRole("button", { name: "Manual notes" }).click();
    await page.getByTestId("generate-bug-report").click();
    await page.getByTestId("send-to-test-generator").click();

    await expect(page).toHaveURL(/#\/test-cases$/);
    await expect(page.getByLabel("User story or acceptance criteria")).toHaveValue(/Regression tests for this bug/);
});
