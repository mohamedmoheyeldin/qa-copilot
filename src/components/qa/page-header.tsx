import type { ReactNode } from "react";

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => (
    <div className="mb-8 flex flex-col gap-4 border-b border-secondary pb-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
            <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
            {description && <p className="mt-1 text-md text-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </div>
);

export const Panel = ({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) => (
    <section className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
        {(title || actions) && (
            <div className="mb-4 flex items-center justify-between gap-3">
                {title && <h2 className="text-lg font-semibold text-primary">{title}</h2>}
                {actions}
            </div>
        )}
        {children}
    </section>
);
