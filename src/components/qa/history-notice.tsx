import { ClockRewind } from "@untitledui/icons";

/** Shown on a tool page when the result was reopened from history. */
export const HistoryNotice = () => (
    <div className="flex items-start gap-3 rounded-lg bg-secondary p-3 text-sm text-secondary" data-testid="history-notice">
        <ClockRewind className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
        <p>Opened from history. The input shows what was sent to the AI, so masked values stay masked. Your edits save automatically.</p>
    </div>
);
