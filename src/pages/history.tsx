import { useMemo, useState } from "react";
import { ClockRewind, Download01, SearchLg, Upload01 } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { FileTrigger } from "@/components/base/file-upload-trigger/file-upload-trigger";
import { Input } from "@/components/base/input/input";
import { HistoryList } from "@/components/qa/history-list";
import { PageHeader } from "@/components/qa/page-header";
import { saveBlob } from "@/lib/export";
import { HISTORY_LIMIT, type HistoryEntry, history, useHistory } from "@/lib/history";

type Filter = "all" | HistoryEntry["tool"];

const searchable = (e: HistoryEntry) => `${e.title} ${e.input}`.toLowerCase();

export const HistoryPage = () => {
    const entries = useHistory();
    const [filter, setFilter] = useState<Filter>("all");
    const [query, setQuery] = useState("");
    const [confirmClear, setConfirmClear] = useState(false);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const samples = entries.filter((e) => e.sample).length;

    const importFile = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        try {
            const added = history.importJson(await file.text());
            setNotice({
                ok: true,
                text: added ? `Imported ${added} ${added === 1 ? "entry" : "entries"}.` : "Nothing new to import. Those entries are already here.",
            });
        } catch (e) {
            setNotice({ ok: false, text: (e as Error).message });
        }
    };
    const exportFile = () =>
        saveBlob(new Blob([history.exportJson()], { type: "application/json" }), `qa-copilot-history-${new Date().toISOString().slice(0, 10)}.json`);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return entries.filter((e) => (filter === "all" || e.tool === filter) && (!q || searchable(e).includes(q)));
    }, [entries, filter, query]);

    return (
        <>
            <PageHeader
                title="History"
                description={`Your last ${HISTORY_LIMIT} results, saved only in this browser. Inputs are stored as they were sent to the AI, so masked values stay masked.`}
                actions={
                    <>
                        <FileTrigger acceptedFileTypes={["application/json"]} onSelect={importFile}>
                            <Button color="secondary" size="sm" iconLeading={Upload01}>
                                Import
                            </Button>
                        </FileTrigger>
                        {entries.length > 0 && (
                            <Button color="secondary" size="sm" iconLeading={Download01} onClick={exportFile}>
                                Export
                            </Button>
                        )}
                        {samples > 0 && (
                            <Button color="secondary" size="sm" onClick={() => history.removeSamples()}>
                                Remove sample data
                            </Button>
                        )}
                        {entries.length > 0 &&
                            (confirmClear ? (
                                <>
                                    <Button color="secondary" size="sm" onClick={() => setConfirmClear(false)}>
                                        Keep history
                                    </Button>
                                    <Button
                                        color="primary-destructive"
                                        size="sm"
                                        onClick={() => {
                                            history.clear();
                                            setConfirmClear(false);
                                        }}
                                    >
                                        Delete all {entries.length}
                                    </Button>
                                </>
                            ) : (
                                <Button color="secondary" size="sm" onClick={() => setConfirmClear(true)}>
                                    Clear history
                                </Button>
                            ))}
                    </>
                }
            />

            <div className="max-w-4xl">
                {notice && (
                    <p
                        role="status"
                        className={`mb-4 rounded-lg p-3 text-sm ${notice.ok ? "bg-success-primary text-success-primary" : "bg-error-primary text-error-primary"}`}
                    >
                        {notice.text}
                    </p>
                )}
                {entries.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl p-6 text-center ring-1 ring-secondary ring-inset">
                        <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
                            <ClockRewind className="size-6 text-fg-quaternary" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-md font-semibold text-primary">Nothing saved yet</p>
                        <p className="mt-1 max-w-sm text-sm text-tertiary">
                            Bug reports and test cases you generate show up here, so you can reopen and edit them later.
                        </p>
                        <div className="mt-5 flex gap-3">
                            <Button size="sm" color="secondary" href="/bug-report">
                                Write a bug report
                            </Button>
                            <Button size="sm" href="/test-cases">
                                Generate test cases
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <ButtonGroup
                                size="sm"
                                selectedKeys={new Set([filter])}
                                onSelectionChange={(keys) => {
                                    const [k] = [...keys];
                                    if (k) setFilter(k as Filter);
                                }}
                                disallowEmptySelection
                                aria-label="Filter by tool"
                            >
                                <ButtonGroupItem id="all">All</ButtonGroupItem>
                                <ButtonGroupItem id="bug">Bug reports</ButtonGroupItem>
                                <ButtonGroupItem id="tests">Test cases</ButtonGroupItem>
                            </ButtonGroup>
                            <Input
                                aria-label="Search history"
                                icon={SearchLg}
                                placeholder="Search"
                                size="sm"
                                value={query}
                                onChange={setQuery}
                                className="sm:max-w-64"
                            />
                        </div>
                        {shown.length ? <HistoryList entries={shown} /> : <p className="py-10 text-center text-sm text-tertiary">No results match.</p>}
                    </>
                )}
            </div>
        </>
    );
};
