import { FileCheck02, Stars02, Trash01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { timeAgo } from "@/lib/format-date";
import { describeTarget } from "@/lib/frameworks";
import { type HistoryEntry, history } from "@/lib/history";

export const toolMeta = {
    bug: { label: "Bug report", icon: FileCheck02, path: "/bug-report" },
    tests: { label: "Test cases", icon: Stars02, path: "/test-cases" },
} as const;

const modeLabel = { demo: "Demo", byok: "API key", prompt: "Prompt only" } as const;

const detail = (e: HistoryEntry) =>
    e.tool === "bug" ? [e.result.severity, e.result.priority].filter(Boolean).join(", ") : `${e.result.cases.length} cases, ${describeTarget(e.meta)}`;

/** A list of saved results. Selecting one reopens it in its tool. */
export const HistoryList = ({ entries, allowDelete = true }: { entries: HistoryEntry[]; allowDelete?: boolean }) => {
    const navigate = useNavigate();

    return (
        <ul className="divide-y divide-secondary rounded-xl ring-1 ring-secondary ring-inset" data-testid="history-list">
            {entries.map((e) => {
                const meta = toolMeta[e.tool];
                return (
                    <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-secondary">
                            <meta.icon className="size-4 text-fg-brand-primary" aria-hidden="true" />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(meta.path, { state: { historyId: e.id } })}
                            className="min-w-0 flex-1 cursor-pointer rounded-md text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <span className="block truncate text-sm font-semibold text-primary">{e.title}</span>
                            <span className="mt-0.5 block truncate text-sm text-tertiary">
                                {meta.label}
                                {detail(e) && `, ${detail(e)}`}
                                <span aria-hidden="true"> · </span>
                                <span className="sr-only">, </span>
                                <time dateTime={e.createdAt}>{timeAgo(e.createdAt)}</time>
                            </span>
                        </button>
                        <div className="hidden shrink-0 gap-1.5 sm:flex">
                            {e.sample && (
                                <Badge size="sm" color="warning">
                                    Sample
                                </Badge>
                            )}
                            <Badge size="sm" color={e.mode === "demo" ? "gray" : "brand"}>
                                {modeLabel[e.mode]}
                            </Badge>
                        </div>
                        {allowDelete && (
                            <ButtonUtility size="xs" color="tertiary" icon={Trash01} tooltip={`Delete "${e.title}"`} onClick={() => history.remove(e.id)} />
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
