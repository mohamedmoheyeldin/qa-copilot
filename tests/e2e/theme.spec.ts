import { expect, test } from "@playwright/test";

test.describe("theme", () => {
    test.use({ colorScheme: "dark" });

    test("defaults to light even when the system is dark, and the choice sticks", async ({ page }) => {
        await page.goto("/");
        const html = page.locator("html");
        await expect(html).not.toHaveClass(/dark-mode/);

        await page
            .getByRole("radio", { name: "Dark theme" })
            .or(page.getByRole("button", { name: "Dark theme" }))
            .first()
            .click();
        await expect(html).toHaveClass(/dark-mode/);

        await page.reload();
        await expect(html).toHaveClass(/dark-mode/);

        await page
            .getByRole("radio", { name: "Match system theme" })
            .or(page.getByRole("button", { name: "Match system theme" }))
            .first()
            .click();
        await page.reload();
        await expect(html).toHaveClass(/dark-mode/);

        await page
            .getByRole("radio", { name: "Light theme" })
            .or(page.getByRole("button", { name: "Light theme" }))
            .first()
            .click();
        await expect(html).not.toHaveClass(/dark-mode/);
    });
});
