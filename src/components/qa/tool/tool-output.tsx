import type { ReactNode } from "react";
import { AlertCircle, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import type { GeneratorStatus } from "@/hooks/use-generator";
import { Panel } from "../page-header";
import { PromptOnlyPanel } from "../prompt-only-panel";

interface ToolOutputProps<T> {
    gen: {
        status: GeneratorStatus;
        result: T | null;
        error: string | null;
        canRetry: boolean;
        retry: () => void;
        pasteablePrompt: string;
        submitPasted: (raw: string) => void;
    };
    emptyTitle: string;
    emptyBody: string;
    children: (result: T) => ReactNode;
}

/** Placeholder shown while the first result is on its way. */
const ResultSkeleton = () => (
    <Panel>
        <div className="flex animate-pulse flex-col gap-4" data-testid="result-skeleton">
            <div className="h-6 w-2/3 rounded bg-tertiary" />
            <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-tertiary" />
                <div className="h-5 w-16 rounded-full bg-tertiary" />
            </div>
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                    <div className="h-4 w-1/4 rounded bg-tertiary" />
                    <div className="h-4 w-full rounded bg-tertiary" />
                    <div className="h-4 w-5/6 rounded bg-tertiary" />
                </div>
            ))}
        </div>
    </Panel>
);

/**
 * Shared output area for every tool. Handles the prompt-only flow, loading, errors, and the empty state,
 * and renders the tool's own result view once there's a result.
 */
export const ToolOutput = <T,>({ gen, emptyTitle, emptyBody, children }: ToolOutputProps<T>) => {
    const isLoading = gen.status === "loading";

    return (
        <div className="flex flex-col gap-6" aria-busy={isLoading} aria-live="polite">
            <p className="sr-only">{isLoading ? "Generating, please wait." : gen.status === "done" ? "Result ready." : ""}</p>

            {gen.status === "awaiting-paste" && <PromptOnlyPanel prompt={gen.pasteablePrompt} error={gen.error} onSubmit={gen.submitPasted} />}

            {gen.status === "error" && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-xl bg-error-primary p-4 text-sm text-error-primary sm:flex-row sm:items-center sm:justify-between"
                >
                    <p className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {gen.error}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        {gen.canRetry && (
                            <Button size="sm" color="secondary" iconLeading={RefreshCw01} onClick={gen.retry}>
                                Try again
                            </Button>
                        )}
                        <Button size="sm" color="secondary" href="/settings">
                            Settings
                        </Button>
                    </div>
                </div>
            )}

            {gen.result ? (
                <div className={isLoading ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>{children(gen.result)}</div>
            ) : isLoading ? (
                <ResultSkeleton />
            ) : (
                gen.status !== "awaiting-paste" && (
                    <Panel>
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <p className="text-md font-semibold text-primary">{emptyTitle}</p>
                            <p className="mt-1 max-w-sm text-sm text-tertiary">{emptyBody}</p>
                        </div>
                    </Panel>
                )
            )}
        </div>
    );
};
