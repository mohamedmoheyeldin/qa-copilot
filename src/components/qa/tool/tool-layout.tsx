import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { PageHeader } from "../page-header";

interface ToolLayoutProps {
    title: string;
    description: string;
    /** Left column: the input panel. */
    input: ReactNode;
    /** Right column: results, prompt-only panel, errors. */
    output: ReactNode;
    /** Give the output column more room (for tables and code). */
    wideOutput?: boolean;
}

/** The shared page frame every QA Copilot tool uses, so all tools look and behave the same. */
export const ToolLayout = ({ title, description, input, output, wideOutput }: ToolLayoutProps) => (
    <>
        <PageHeader title={title} description={description} />
        <div className={cx("grid gap-6", wideOutput ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "xl:grid-cols-2")}>
            <div className="min-w-0">{input}</div>
            <div className="flex min-w-0 flex-col gap-6">{output}</div>
        </div>
    </>
);
