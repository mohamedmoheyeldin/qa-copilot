import { useSyncExternalStore } from "react";
import { normalizeTarget } from "./frameworks";
import type { BugReport, BugSource, CodeTarget, GeneratedFile, TestGenResult } from "./types";

/**
 * Local history of generated results, shared by every tool.
 *
 * Privacy rule: we store the input exactly as it was sent to the AI. When redaction is on,
 * that's the masked text, so sensitive values never land in localStorage.
 */

const STORAGE_KEY = "qa-copilot:history";
export const HISTORY_LIMIT = 50;

interface Base {
    id: string;
    createdAt: string;
    title: string;
    /** The input as sent to the AI (redacted when redaction is on). */
    input: string;
    mode: "demo" | "byok" | "prompt";
    /** Sample data loaded for a presentation. Removed separately from real history. */
    sample?: boolean;
}

export interface BugHistoryEntry extends Base {
    tool: "bug";
    result: BugReport;
    meta: { source: BugSource; trackerId: string };
}

export interface TestsHistoryEntry extends Base {
    tool: "tests";
    result: TestGenResult;
    /** What the code was generated for. */
    meta: CodeTarget;
}

export type HistoryEntry = BugHistoryEntry | TestsHistoryEntry;
export type NewHistoryEntry = Omit<BugHistoryEntry, "id" | "createdAt"> | Omit<TestsHistoryEntry, "id" | "createdAt">;

const listeners = new Set<() => void>();
let cache: HistoryEntry[] | null = null;

/**
 * Upgrades entries saved by older versions: single `code` strings become `files`,
 * and targets without a BDD flag get one. Unknown shapes are dropped instead of crashing the app.
 */
export const normalizeEntry = (e: unknown): HistoryEntry | null => {
    const entry = e as HistoryEntry & { result: { code?: string; files?: GeneratedFile[] } };
    if (!entry || typeof entry !== "object" || !entry.id || !entry.result || (entry.tool !== "bug" && entry.tool !== "tests")) return null;
    if (entry.tool === "bug") return entry;
    const meta = normalizeTarget({ ...entry.meta, bdd: !!(entry.meta as Partial<CodeTarget>).bdd });
    const { code, ...rest } = entry.result;
    const files = rest.files?.length
        ? rest.files
        : code
          ? [{ path: meta.framework === "cypress" ? "generated.cy.ts" : "generated.spec.ts", content: code }]
          : [];
    return { ...entry, meta, result: { ...rest, files } as TestGenResult };
};

const read = (): HistoryEntry[] => {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        cache = Array.isArray(parsed) ? parsed.map(normalizeEntry).filter((e): e is HistoryEntry => !!e) : [];
    } catch {
        cache = [];
    }
    return cache;
};

const write = (entries: HistoryEntry[]) => {
    cache = entries;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // Storage full or blocked. History is a convenience, so the app keeps working without it.
    }
    listeners.forEach((l) => l());
};

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const history = {
    list: read,
    get: (id: string) => read().find((e) => e.id === id),
    /** Adds an entry and returns its id. Oldest entries drop off past the limit. */
    add: (entry: NewHistoryEntry): string => {
        const full = { ...entry, id: newId(), createdAt: new Date().toISOString() } as HistoryEntry;
        write([full, ...read()].slice(0, HISTORY_LIMIT));
        return full.id;
    },
    /** Keeps a saved entry in sync when the user edits the result. */
    update: (id: string, patch: Partial<Pick<HistoryEntry, "title" | "result" | "meta">>) =>
        write(read().map((e) => (e.id === id ? ({ ...e, ...patch } as HistoryEntry) : e))),
    remove: (id: string) => write(read().filter((e) => e.id !== id)),
    clear: () => write([]),
    /** Adds sample entries for demos, replacing any previous samples. */
    addSamples: (entries: HistoryEntry[]) =>
        write([...read().filter((e) => !e.sample), ...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, HISTORY_LIMIT)),
    removeSamples: () => write(read().filter((e) => !e.sample)),
    /** JSON backup of all entries. */
    exportJson: () => JSON.stringify({ app: "qa-copilot", kind: "history", version: 1, entries: read() }, null, 2),
    /** Merges a backup into the current history (skipping duplicates) and returns how many were added. */
    importJson: (text: string): number => {
        const data = JSON.parse(text);
        if (data?.app !== "qa-copilot" || data?.kind !== "history" || !Array.isArray(data.entries))
            throw new Error("This file isn't a QA Copilot history export.");
        const existing = new Set(read().map((e) => e.id));
        const incoming = (data.entries as unknown[]).map(normalizeEntry).filter((e): e is HistoryEntry => !!e && !existing.has(e.id));
        write([...read(), ...incoming].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, HISTORY_LIMIT));
        return incoming.length;
    },
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                cache = null;
                listener();
            }
        };
        window.addEventListener("storage", onStorage);
        return () => {
            listeners.delete(listener);
            window.removeEventListener("storage", onStorage);
        };
    },
};

export const useHistory = () => useSyncExternalStore(history.subscribe, history.list, () => []);
