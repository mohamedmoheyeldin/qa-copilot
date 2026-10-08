import { useEffect, useMemo, useState } from "react";
import { Check, Copy01, Download01, File02, FolderCode } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useClipboard } from "@/hooks/use-clipboard";
import { fileLanguage } from "@/lib/codegen";
import { exportZip, saveBlob } from "@/lib/export";
import type { GeneratedFile } from "@/lib/types";
import { cx } from "@/utils/cx";

/** Feature files first, then code, then docs, so BDD output reads in the order people use it. */
const order = (path: string) =>
    path.endsWith(".feature") ? 0 : path === "README.md" ? 3 : /(world|hooks|environment|config|conftest|Run)/i.test(path) ? 2 : 1;

export const CodeViewer = ({ files, zipName }: { files: GeneratedFile[]; zipName: string }) => {
    const sorted = useMemo(() => [...files].sort((a, b) => order(a.path) - order(b.path) || a.path.localeCompare(b.path)), [files]);
    const [active, setActive] = useState(sorted[0]?.path);
    const clipboard = useClipboard();
    const current = sorted.find((f) => f.path === active) ?? sorted[0];

    // When the file set changes (new framework or language), show its first file.
    useEffect(() => {
        if (!sorted.some((f) => f.path === active)) setActive(sorted[0]?.path);
    }, [sorted, active]);

    if (!current) return <p className="text-sm text-tertiary">No code was generated.</p>;
    const lines = current.content.replace(/\n$/, "").split("\n");

    return (
        <div className="flex flex-col gap-3" data-testid="code-viewer">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Generated files">
                    {sorted.map((f) => (
                        <button
                            key={f.path}
                            type="button"
                            role="tab"
                            aria-selected={f.path === current.path}
                            title={f.path}
                            onClick={() => setActive(f.path)}
                            className={cx(
                                "flex max-w-56 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-focus-ring transition focus-visible:outline-2",
                                f.path === current.path
                                    ? "bg-brand-primary_alt text-brand-secondary ring-1 ring-brand"
                                    : "text-tertiary ring-1 ring-secondary hover:bg-primary_hover",
                            )}
                        >
                            <File02 className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{f.path.split("/").pop()}</span>
                        </button>
                    ))}
                </div>
                {sorted.length > 1 && (
                    <Button size="sm" color="secondary" iconLeading={FolderCode} onClick={() => exportZip(sorted, zipName)} data-testid="download-zip">
                        Download all (.zip)
                    </Button>
                )}
            </div>

            <div className="overflow-hidden rounded-lg ring-1 ring-secondary">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-secondary bg-secondary px-3 py-2">
                    <p className="min-w-0 truncate font-mono text-xs text-secondary" data-testid="active-file-path">
                        {current.path} <span className="text-quaternary">· {fileLanguage(current.path)}</span>
                    </p>
                    <div className="flex gap-1.5">
                        <Button size="sm" color="tertiary" iconLeading={clipboard.copied ? Check : Copy01} onClick={() => clipboard.copy(current.content)}>
                            {clipboard.copied ? "Copied" : "Copy"}
                        </Button>
                        <Button
                            size="sm"
                            color="tertiary"
                            iconLeading={Download01}
                            onClick={() => saveBlob(new Blob([current.content], { type: "text/plain" }), current.path.split("/").pop() ?? "file.txt")}
                        >
                            Download
                        </Button>
                    </div>
                </div>
                <pre
                    tabIndex={0}
                    aria-label={`Contents of ${current.path}`}
                    className="max-h-[32rem] overflow-auto bg-primary py-3 font-mono text-xs leading-5 text-primary"
                >
                    <code className="grid grid-cols-[auto_1fr]">
                        {lines.map((line, i) => (
                            <span key={i} className="contents">
                                <span className="pr-4 pl-3 text-right text-quaternary select-none" aria-hidden="true">
                                    {i + 1}
                                </span>
                                <span className={cx("pr-4 whitespace-pre", /^\s*(\/\/|#)\s*TODO/.test(line) && "text-warning-primary")}>{line || " "}</span>
                            </span>
                        ))}
                    </code>
                </pre>
            </div>
        </div>
    );
};
