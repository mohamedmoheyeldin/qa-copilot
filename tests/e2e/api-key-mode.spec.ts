import { type Page, expect, test } from "@playwright/test";
import { demoTestResult } from "../../src/lib/demo-data";
import { choose, openCodeTab } from "./support/helpers";

// These tests cover "Your API key" mode without a real key by intercepting the provider call.

const useApiKeyMode = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem("qa-copilot:settings", JSON.stringify({ aiMode: "byok", provider: "anthropic", apiKey: "sk-ant-test", model: "claude-test" }));
    });
};

const anthropicReply = (text: string, stop_reason = "end_turn") => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ content: [{ type: "text", text }], stop_reason }),
});

test.describe("Your API key mode", () => {
    test.beforeEach(async ({ page }) => useApiKeyMode(page));

    test("sends the request with the key and renders the parsed result", async ({ page }) => {
        let headers: Record<string, string> = {};
        await page.route("https://api.anthropic.com/v1/messages", async (route) => {
            headers = route.request().headers();
            await route.fulfill(anthropicReply("```json\n" + JSON.stringify(demoTestResult) + "\n```"));
        });

        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();

        await expect(page.getByTestId("test-case-table")).toBeVisible();
        expect(headers["x-api-key"]).toBe("sk-ant-test");
        expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    });

    test("explains a rejected key and offers no pointless retry", async ({ page }) => {
        await page.route("https://api.anthropic.com/v1/messages", (route) =>
            route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { message: "invalid x-api-key" } }) }),
        );
        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();

        await expect(page.getByRole("alert")).toContainText("rejected the API key");
        await expect(page.getByRole("button", { name: "Try again" })).toBeHidden();
    });

    test("recovers from a temporary outage with Try again", async ({ page }) => {
        let calls = 0;
        await page.route("https://api.anthropic.com/v1/messages", (route) => {
            calls++;
            return calls === 1 ? route.fulfill({ status: 529, body: "{}" }) : route.fulfill(anthropicReply(JSON.stringify(demoTestResult)));
        });
        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();

        await expect(page.getByRole("alert")).toContainText("having trouble");
        await page.getByRole("button", { name: "Try again" }).click();
        await expect(page.getByTestId("test-case-table")).toBeVisible();
    });

    test("catches a reply that was cut off", async ({ page }) => {
        await page.route("https://api.anthropic.com/v1/messages", (route) => route.fulfill(anthropicReply('{"cases": [', "max_tokens")));
        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();
        await expect(page.getByRole("alert")).toContainText("ran out of room");
    });

    test("Test connection in Settings reports success", async ({ page }) => {
        await page.route("https://api.anthropic.com/v1/messages", (route) => route.fulfill(anthropicReply('{"ok": true}')));
        await page.goto("/#/settings");
        await page.getByRole("button", { name: "Test connection" }).click();
        await expect(page.getByTestId("connection-result")).toContainText("Connected to Anthropic with claude-test");
    });

    test("after switching frameworks, Update code with AI keeps the cases and rewrites only the code", async ({ page }) => {
        const bodies: string[] = [];
        const aiFiles = [{ path: "tests/password-reset.spec.ts", content: "// AI playwright code" }];
        const aiJava = [{ path: "src/test/java/tests/PasswordResetTest.java", content: "// AI selenium java code" }];
        await page.route("https://api.anthropic.com/v1/messages", async (route) => {
            const body = route.request().postData() ?? "";
            bodies.push(body);
            const files = bodies.length === 1 ? aiFiles : aiJava;
            await route.fulfill(anthropicReply(JSON.stringify(bodies.length === 1 ? { ...demoTestResult, files } : { files })));
        });

        await page.goto("/#/test-cases");
        await page.getByRole("button", { name: "Password reset" }).click();
        await page.getByTestId("generate-test-cases").click();
        await expect(page.getByTestId("test-case-table")).toBeVisible();
        await openCodeTab(page);
        await expect(page.getByTestId("code-viewer")).toContainText("AI playwright code");

        await choose(page, "Framework", "Selenium");
        await choose(page, "Language", "Java");
        await expect(page.getByTestId("stale-code-notice")).toContainText("This code is for Playwright, TypeScript");
        await page.getByTestId("update-code-ai").click();
        await expect(page.getByTestId("code-viewer")).toContainText("AI selenium java code");
        await expect(page.getByTestId("stale-code-notice")).toBeHidden();
        // The second request sent the existing cases and asked for Selenium Java only.
        expect(bodies[1]).toContain("SHOP-TC-001");
        expect(bodies[1]).toContain("Selenium, Java");

        // Offline conversion needs no request at all.
        await choose(page, "Framework", "Cypress");
        await page.getByTestId("convert-offline").click();
        await expect(page.getByTestId("code-target")).toHaveText("Cypress, TypeScript");
        await expect(page.getByTestId("code-viewer")).toContainText('cy.visit("/login")');
        expect(bodies).toHaveLength(2);
    });

    test("Load models lists what the key can use", async ({ page }) => {
        await page.route("https://api.anthropic.com/v1/models?limit=100", (route) =>
            route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "claude-a" }, { id: "claude-b" }] }) }),
        );
        await page.goto("/#/settings");
        await page.getByTestId("load-models").click();
        await expect(page.getByTestId("models-hint")).toHaveText("2 models available to this key.");
        await choose(page, "Model", "claude-b");
        await expect(page.getByRole("button", { name: /Model/ }).first()).toContainText("claude-b");
    });

    test("switching providers keeps each provider's key", async ({ page }) => {
        await page.goto("/#/settings");
        await choose(page, "Provider", "Google Gemini");
        await expect(page.getByRole("textbox", { name: "API key", exact: true })).toHaveValue("");
        await page.getByRole("textbox", { name: "API key", exact: true }).fill("AIza-test");
        await choose(page, "Provider", "Anthropic (Claude)");
        await expect(page.getByRole("textbox", { name: "API key", exact: true })).toHaveValue("sk-ant-test");
        await choose(page, "Provider", "Google Gemini");
        await expect(page.getByRole("textbox", { name: "API key", exact: true })).toHaveValue("AIza-test");
    });
});
