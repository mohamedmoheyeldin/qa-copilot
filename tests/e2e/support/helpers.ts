import type { Page } from "@playwright/test";

/** Picks an option from an Untitled UI / React Aria select by its visible label. */
export const choose = async (page: Page, label: string, option: string) => {
    await page
        .getByRole("button", { name: new RegExp(label) })
        .first()
        .click();
    await page.getByRole("option", { name: option, exact: true }).click();
};

export const generateSampleTests = async (page: Page, sample = "Password reset") => {
    await page.goto("/#/test-cases");
    await page.getByRole("button", { name: sample }).click();
    await page.getByTestId("generate-test-cases").click();
    await page.getByTestId("test-case-table").waitFor();
};

export const openCodeTab = (page: Page) => page.getByRole("tab", { name: /^Code/ }).click();
