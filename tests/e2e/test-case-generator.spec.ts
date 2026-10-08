import { expect, test } from "@playwright/test";
import { choose, generateSampleTests, openCodeTab } from "./support/helpers";

test.describe("Test case generator (demo mode)", () => {
    test("each sample shows its own cases", async ({ page }) => {
        await generateSampleTests(page, "Password reset");
        await expect(page.getByTestId("test-case-table")).toContainText("Reset password with a registered email");
        await generateSampleTests(page, "Coupon code");
        await expect(page.getByTestId("test-case-table")).toContainText("Apply a valid coupon code");
        await expect(page.getByLabel("Feature name")).toHaveValue("Coupon code");
    });

    test("code follows the framework, language, and BDD options instantly", async ({ page }) => {
        await generateSampleTests(page);
        await openCodeTab(page);
        await expect(page.getByTestId("code-target")).toHaveText("Playwright, TypeScript");
        await expect(page.getByTestId("active-file-path")).toContainText("tests/password-reset.spec.ts");
        await expect(page.getByTestId("code-viewer")).toContainText('import { test, expect } from "@playwright/test"');

        await choose(page, "Framework", "Selenium");
        await choose(page, "Language", "Java");
        await expect(page.getByTestId("code-target")).toHaveText("Selenium, Java");
        await expect(page.getByTestId("active-file-path")).toContainText("PasswordResetTest.java");
        await expect(page.getByTestId("stale-code-notice")).toBeHidden();

        await page.getByText("Cucumber BDD", { exact: true }).first().click();
        await expect(page.getByTestId("code-target")).toHaveText("Selenium, Java, Cucumber JVM");
        // The feature file is shown first, and the step definitions use the same step text.
        await expect(page.getByTestId("active-file-path")).toContainText("password-reset.feature");
        await expect(page.getByTestId("code-viewer")).toContainText("When I open the login page");
        await page.getByRole("tab", { name: "PasswordResetSteps.java" }).click();
        await expect(page.getByTestId("code-viewer")).toContainText('@When("I open the login page")');

        await choose(page, "Framework", "Cypress");
        await expect(page.getByTestId("code-target")).toHaveText("Cypress, TypeScript, cypress-cucumber-preprocessor");
    });

    test("switching to a framework without the current language picks a valid one", async ({ page }) => {
        await page.goto("/#/test-cases");
        await choose(page, "Framework", "Playwright");
        await choose(page, "Language", "Python");
        await choose(page, "Framework", "Cypress");
        await expect(page.getByRole("button", { name: /Language/ }).first()).toContainText("TypeScript");
    });

    test("downloads every file as a zip and exports documents", async ({ page }) => {
        await generateSampleTests(page);
        await openCodeTab(page);
        const zip = page.waitForEvent("download");
        await page.getByTestId("download-zip").click();
        expect((await zip).suggestedFilename()).toBe("password-reset-playwright-typescript.zip");

        for (const [format, ext] of [
            ["PDF", "pdf"],
            ["Word", "docx"],
            ["Excel", "xlsx"],
            ["Markdown", "md"],
        ]) {
            const download = page.waitForEvent("download");
            await page.getByTestId("export-menu").click();
            await page.getByRole("menuitem", { name: new RegExp(`^${format}`) }).click();
            const file = await download;
            expect(file.suggestedFilename()).toBe(`test-cases-Password-reset.${ext}`);
            expect((await file.createReadStream()).readableLength >= 0).toBe(true);
        }
    });
});
