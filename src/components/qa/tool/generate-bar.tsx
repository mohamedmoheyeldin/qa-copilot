import { Stars02 } from "@untitledui/icons";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/base/buttons/button";

interface GenerateBarProps {
    label: string;
    isLoading: boolean;
    isDisabled: boolean;
    onGenerate: () => void;
    onCancel: () => void;
    testId?: string;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The primary action row at the bottom of every tool's input panel. Ctrl/Cmd + Enter generates. */
export const GenerateBar = ({ label, isLoading, isDisabled, onGenerate, onCancel, testId }: GenerateBarProps) => {
    useHotkeys(
        "mod+enter",
        () => {
            if (!isLoading && !isDisabled) onGenerate();
        },
        { enableOnFormTags: true, preventDefault: true },
        [isLoading, isDisabled, onGenerate],
    );

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                iconLeading={Stars02}
                isLoading={isLoading}
                isDisabled={isDisabled}
                onClick={onGenerate}
                data-testid={testId}
                aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
            >
                {label}
            </Button>
            {isLoading ? (
                <Button color="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            ) : (
                <span className="hidden text-xs text-tertiary sm:inline" aria-hidden="true">
                    or press <kbd className="rounded border border-secondary px-1.5 py-0.5 font-mono text-xs text-secondary">{isMac ? "⌘" : "Ctrl"}</kbd> +{" "}
                    <kbd className="rounded border border-secondary px-1.5 py-0.5 font-mono text-xs text-secondary">Enter</kbd>
                </span>
            )}
        </div>
    );
};
