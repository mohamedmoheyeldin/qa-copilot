import { expect, test } from "@playwright/test";

test("dashboard links to both tools", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Write a bug report" }).click();
    await expect(page).toHaveURL(/#\/bug-report$/);
    await expect(page.getByRole("heading", { name: "Bug report writer", level: 1 })).toBeVisible();
});

test("deep links work after a reload (GitHub Pages)", async ({ page }) => {
    await page.goto("/#/test-cases");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Test case generator", level: 1 })).toBeVisible();
});

test("unknown routes show the not found page", async ({ page }) => {
    await page.goto("/#/nope");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /home|dashboard/i }).first()).toBeVisible();
});
