import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
    test("sample data fills the dashboard for presentations and removes cleanly", async ({ page }) => {
        await page.goto("/");
        await page.getByTestId("load-sample-data").click();

        await expect(page.getByTestId("kpi-bug-reports")).toContainText(/\d/);
        await expect(page.getByTestId("kpi-test-cases")).not.toContainText(/^0/);
        await expect(page.getByRole("region", { name: "Activity, last 14 days" }).locator("svg").first()).toBeVisible();
        await expect(page.getByRole("region", { name: "Frameworks generated" })).toContainText("Selenium, Java, Cucumber JVM");
        await expect(page.getByRole("status")).toContainText("sample data");

        // Sample entries open like real ones.
        await page.getByRole("region", { name: "Recent" }).getByRole("button").first().click();
        await expect(page.getByTestId("history-notice")).toBeVisible();

        await page.goto("/");
        await page.getByRole("button", { name: "Remove sample data" }).click();
        await expect(page.getByTestId("load-sample-data")).toBeVisible();
    });

    test("counts real work", async ({ page }) => {
        await page.goto("/#/bug-report");
        await page.getByRole("button", { name: "Manual notes" }).click();
        await page.getByTestId("generate-bug-report").click();
        await expect(page.getByTestId("bug-report-preview")).toContainText("Payment spinner never finishes on Safari");
        await page.goto("/");
        await expect(page.getByTestId("kpi-bug-reports")).toContainText("1");
        await expect(page.getByRole("region", { name: "Bug reports by severity" })).toContainText("Critical");
    });
});
