import type { ReactNode } from "react";
import { BarChart10, ClockRewind, FileCheck02, Settings01, Stars02 } from "@untitledui/icons";
import { useLocation } from "react-router";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { AiModeBadge } from "./ai-mode-badge";
import { QaCopilotLogo } from "./logo";
import { ThemeSwitcher } from "./theme-switcher";

const navItems: NavItemType[] = [
    { label: "Dashboard", href: "/", icon: BarChart10 },
    { label: "Bug report writer", href: "/bug-report", icon: FileCheck02 },
    { label: "Test case generator", href: "/test-cases", icon: Stars02 },
    { label: "History", href: "/history", icon: ClockRewind },
];

const SIDEBAR_WIDTH = 272;

export const AppShell = ({ children }: { children: ReactNode }) => {
    const { pathname } = useLocation();

    const sidebar = (
        <aside
            style={{ "--width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
            className="flex h-full w-full flex-col justify-between overflow-auto border-secondary bg-primary pt-4 md:border-r lg:w-(--width) lg:pt-5"
        >
            <div className="px-5">
                <QaCopilotLogo />
            </div>
            <NavList activeUrl={pathname} items={navItems} />
            <div className="mt-auto flex flex-col gap-3 px-4 py-5">
                <NavItemBase type="link" href="/settings" icon={Settings01} current={pathname === "/settings"}>
                    Settings
                </NavItemBase>
                <div className="flex items-center justify-between gap-3 px-3">
                    <AiModeBadge />
                    <ThemeSwitcher />
                </div>
            </div>
        </aside>
    );

    return (
        <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
            <a
                href="#main-content"
                onClick={(e) => {
                    // HashRouter owns the URL hash, so move focus without changing it.
                    e.preventDefault();
                    document.getElementById("main-content")?.focus();
                }}
                className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-brand-secondary shadow-lg ring-1 ring-secondary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to content
            </a>
            <MobileNavigationHeader logo={<QaCopilotLogo />}>{sidebar}</MobileNavigationHeader>
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{sidebar}</div>
            <div style={{ paddingLeft: SIDEBAR_WIDTH }} className="hidden lg:block" />
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 outline-none md:px-8">
                {children}
            </main>
        </div>
    );
};
