// Captures README screenshots, the demo animation, and the social preview from the production build.
// Usage: npm run build && npx vite preview --port 4173   then, in another terminal:   npm run media
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:4173";
const out = "docs/media";
const browser = await chromium.launch();

const choose = async (page, label, option) => {
    await page
        .getByRole("button", { name: new RegExp(label) })
        .first()
        .click();
    await page.getByRole("option", { name: option, exact: true }).click();
};
const withSamples = (page) => page.getByTestId("load-sample-data").click();
const bdd = async (page) => {
    await page.getByRole("button", { name: "Password reset" }).click();
    await choose(page, "Framework", "Selenium");
    await choose(page, "Language", "Java");
    await page.getByText("Cucumber BDD", { exact: true }).first().click();
    await page.getByTestId("generate-test-cases").click();
    await page.getByTestId("test-case-table").waitFor();
    await page.getByRole("tab", { name: /^Code/ }).click();
    await page.getByRole("tab", { name: "PasswordResetSteps.java" }).click();
};
const bug = async (page) => {
    await page.getByRole("button", { name: "Manual notes" }).click();
    await page.getByTestId("generate-bug-report").click();
    await page.getByTestId("bug-report-preview").waitFor();
};

const shot = async ({ theme = "light", path, name, prepare, size = { width: 1440, height: 900 }, scale = 2 }) => {
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: scale, colorScheme: theme });
    const page = await ctx.newPage();
    await page.addInitScript((t) => localStorage.setItem("ui-theme", t), theme);
    await page.goto(`${base}/${path}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    if (prepare) await prepare(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: name.endsWith(".png") ? name : `${out}/${name}-${theme}.png` });
    await ctx.close();
};

if (!process.env.VIDEO_ONLY) {
    for (const theme of ["light", "dark"]) {
        await shot({ theme, path: "#/", name: "dashboard", prepare: withSamples });
        await shot({ theme, path: "#/test-cases", name: "test-cases", prepare: bdd });
        await shot({ theme, path: "#/bug-report", name: "bug-report", prepare: bug });
    }
    await shot({ path: "#/", name: "public/og-image.png", prepare: withSamples, size: { width: 1200, height: 630 }, scale: 1 });
}

// Demo: dashboard with sample data, then generate, switch framework and language, turn on BDD, show the feature and steps, export.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${out}/raw`, size: { width: 1280, height: 800 } } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem("ui-theme", "light"));
const pause = (ms = 900) => page.waitForTimeout(ms);
await page.goto(`${base}/#/`);
await page.getByTestId("load-sample-data").click();
await pause(2400);
await page.goto(`${base}/#/test-cases`);
await pause();
await page.getByRole("button", { name: "Password reset" }).click();
await pause(600);
await page.getByTestId("generate-test-cases").click();
await page.getByTestId("test-case-table").waitFor();
await pause(1400);
await page.getByRole("tab", { name: /^Code/ }).click();
await pause(1400);
await choose(page, "Framework", "Selenium");
await pause(500);
await choose(page, "Language", "Python");
await pause(1400);
await page.getByText("Cucumber BDD", { exact: true }).first().click();
await pause(1600);
await page.getByRole("tab", { name: "password_reset_steps.py" }).click();
await pause(1600);
await choose(page, "Framework", "Playwright");
await choose(page, "Language", "TypeScript");
await pause(1600);
await ctx.close();
await browser.close();
