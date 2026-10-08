import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router";
import { AppShell } from "@/components/qa/app-shell";
import { SettingsProvider } from "@/lib/settings-context";
import { RouteProvider } from "@/providers/router-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";

// Each page loads on demand, so the first visit only downloads what it shows.
const Dashboard = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.Dashboard })));
const BugReportWriter = lazy(() => import("@/pages/bug-report-writer").then((m) => ({ default: m.BugReportWriter })));
const TestCaseGenerator = lazy(() => import("@/pages/test-case-generator").then((m) => ({ default: m.TestCaseGenerator })));
const HistoryPage = lazy(() => import("@/pages/history").then((m) => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })));
const NotFound = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFound })));

const PageLoading = () => (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading page">
        <div className="h-8 w-64 rounded bg-tertiary" />
        <div className="h-4 w-96 max-w-full rounded bg-tertiary" />
        <div className="mt-6 h-64 rounded-xl bg-secondary" />
    </div>
);

// HashRouter keeps deep links working on GitHub Pages, which has no server-side routing.
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <SettingsProvider>
                <HashRouter>
                    <RouteProvider>
                        <AppShell>
                            <Suspense fallback={<PageLoading />}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/bug-report" element={<BugReportWriter />} />
                                    <Route path="/test-cases" element={<TestCaseGenerator />} />
                                    <Route path="/history" element={<HistoryPage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>
                        </AppShell>
                    </RouteProvider>
                </HashRouter>
            </SettingsProvider>
        </ThemeProvider>
    </StrictMode>,
);
