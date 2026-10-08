import { expect, test } from "@playwright/test";
import { openCodeTab } from "./support/helpers";

test.describe("Editing generated test cases", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        // Ctrl+Enter from the requirement field generates, same as the button.
        await page.getByLabel("User story or acceptance criteria").press("Control+Enter");
        await expect(page.getByTestId("test-case-table")).toBeVisible();
    });

    test("edit, add, and delete cases, and the demo code follows", async ({ page }) => {
        const rows = page.getByTestId("test-case-table").locator("tbody tr");
        await expect(rows).toHaveCount(6);

        await page.getByRole("button", { name: "Edit SHOP-TC-001" }).click();
        await page.getByTestId("case-editor").getByLabel("Title").fill("Reset email arrives for a registered user");
        await page.getByRole("button", { name: "Save case" }).click();
        await expect(page.getByTestId("test-case-table")).toContainText("Reset email arrives for a registered user");

        await page.getByRole("button", { name: "Delete SHOP-TC-002" }).click();
        await expect(rows).toHaveCount(5);

        // A new case cancelled before saving disappears instead of leaving a blank row.
        await page.getByRole("button", { name: "Add case" }).click();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(rows).toHaveCount(5);

        await page.getByRole("button", { name: "Add case" }).click();
        await page.getByTestId("case-editor").getByLabel("Title").fill("Reset link works only once");
        await page.getByRole("button", { name: "Save case" }).click();
        await expect(page.getByTestId("test-case-table")).toContainText("SHOP-TC-007");

        await openCodeTab(page);
        await expect(page.getByTestId("code-viewer")).toContainText("SHOP-TC-001: Reset email arrives for a registered user");
        await expect(page.getByTestId("code-viewer")).not.toContainText("SHOP-TC-002");
        await expect(page.getByTestId("stale-code-notice")).toBeHidden();
    });
});
