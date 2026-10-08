import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSettings } from "./defaults";
import { normalizeTarget } from "./frameworks";
import type { Settings } from "./types";

const STORAGE_KEY = "qa-copilot:settings";

interface SettingsContextValue {
    settings: Settings;
    update: (patch: Partial<Settings>) => void;
    replace: (next: Settings) => void;
    reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Merge stored settings over defaults so new fields added later always have a value. */
const load = (): Settings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSettings;
        const stored = JSON.parse(raw) as Partial<Settings>;
        const merged: Settings = {
            ...defaultSettings,
            ...stored,
            project: { ...defaultSettings.project, ...stored.project },
            redaction: { ...defaultSettings.redaction, ...stored.redaction },
            testGen: { ...defaultSettings.testGen, ...stored.testGen },
            bug: { ...defaultSettings.bug, ...stored.bug },
            trackers: stored.trackers?.length ? stored.trackers : defaultSettings.trackers,
            apiKeys: { ...stored.apiKeys },
            models: { ...stored.models },
        };
        // Keep the language valid for the framework (older versions allowed fewer combinations).
        const target = normalizeTarget(merged.testGen);
        merged.testGen = { ...merged.testGen, framework: target.framework, language: target.language };
        return merged;
    } catch {
        return defaultSettings;
    }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<Settings>(load);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);
    const replace = useCallback((next: Settings) => setSettings(next), []);
    const reset = useCallback(() => setSettings(defaultSettings), []);

    const value = useMemo(() => ({ settings, update, replace, reset }), [settings, update, replace, reset]);
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
};

/** Export settings without any API keys, so the file is safe to share with teammates. */
export const exportSettings = (settings: Settings) => {
    const { apiKey: _omit, apiKeys: _omitAll, ...shareable } = settings;
    const blob = new Blob([JSON.stringify(shareable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qa-copilot-settings.json";
    a.click();
    URL.revokeObjectURL(url);
};

export const parseImportedSettings = (text: string, current: Settings): Settings => {
    const data = JSON.parse(text) as Partial<Settings>;
    if (data.version !== 1 || !Array.isArray(data.trackers)) {
        throw new Error("This file isn't a QA Copilot settings export.");
    }
    return {
        ...defaultSettings,
        ...data,
        apiKey: current.apiKey,
        apiKeys: current.apiKeys,
        project: { ...defaultSettings.project, ...data.project },
        redaction: { ...defaultSettings.redaction, ...data.redaction },
        testGen: { ...defaultSettings.testGen, ...data.testGen },
        bug: { ...defaultSettings.bug, ...data.bug },
    } as Settings;
};
