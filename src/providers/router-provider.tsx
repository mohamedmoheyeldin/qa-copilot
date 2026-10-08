import { type PropsWithChildren } from "react";
import { RouterProvider } from "react-aria-components";
import { useHref, useNavigate } from "react-router";
import type { NavigateOptions } from "react-router";

declare module "react-aria-components" {
    interface RouterConfig {
        routerOptions: NavigateOptions;
    }
}

// useHref turns "/settings" into "#/settings" so React Aria links work with HashRouter.
export const RouteProvider = ({ children }: PropsWithChildren) => {
    const navigate = useNavigate();

    return (
        <RouterProvider navigate={navigate} useHref={useHref}>
            {children}
        </RouterProvider>
    );
};
