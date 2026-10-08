import { expect, test } from "@playwright/test";

test("prompt-only mode builds a prompt and formats a pasted answer", async ({ page }) => {
    await page.goto("/#/settings");
    // React Aria hides the native input, so click the visible label.
    await page.getByText("Prompt only", { exact: true }).click();
    await expect(page.getByRole("radio", { name: /Prompt only/ })).toBeChecked();

    await page.goto("/#/bug-report");
    await page.getByLabel("What happened?").fill("Login button does nothing on Firefox in staging.");
    await page.getByTestId("generate-bug-report").click();

    await expect(page.getByText("Copy this prompt into your AI tool")).toBeVisible();
    await expect(page.locator("pre").first()).toContainText("Login button does nothing");

    const answer = JSON.stringify({
        title: "[Login] Login button unresponsive on Firefox",
        summary: "Clicking Login does nothing on Firefox.",
        steps: ["Open staging in Firefox", "Enter valid credentials", "Click Login"],
        expected: "User is logged in.",
        actual: "Nothing happens.",
        environment: "staging, Firefox",
        severity: "Major",
        priority: "High",
    });
    await page.getByLabel("AI response").fill("```json\n" + answer + "\n```");
    await page.getByRole("button", { name: "Format answer" }).click();

    await expect(page.getByTestId("bug-report-preview")).toContainText("Login button unresponsive on Firefox");
});
