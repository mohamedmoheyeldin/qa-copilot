import { defineConfig, devices } from "@playwright/test";

// Tests run against the production build (vite preview), the same files GitHub Pages serves.
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://localhost:4173",
        trace: "on-first-retry",
        permissions: ["clipboard-read", "clipboard-write"],
    },
    // `npm run test:e2e:edge` uses the Edge already installed on Windows, for networks that block
    // Playwright's browser download. Everything else (including CI) uses Playwright's Chromium.
    projects:
        process.env.npm_lifecycle_event === "test:e2e:edge"
            ? [{ name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }]
            : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
