import { InfoCircle, ShieldTick } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useSettings } from "@/lib/settings-context";

export const ModeNotice = ({ redactedCount }: { redactedCount: number }) => {
    const { settings } = useSettings();

    return (
        <div className="flex flex-col gap-2">
            {settings.aiMode === "demo" && (
                <div className="flex items-start gap-3 rounded-lg bg-secondary p-3 text-sm text-secondary">
                    <InfoCircle className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
                    <p>
                        Demo mode shows a built-in sample result, whatever you type. Switch to your own API key or prompt-only mode for real results.{" "}
                        <Button color="link-color" size="sm" href="/settings">
                            Change mode
                        </Button>
                    </p>
                </div>
            )}
            {redactedCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-success-primary p-3 text-sm text-success-primary">
                    <ShieldTick className="size-4 shrink-0" />
                    <p>
                        Masked {redactedCount} sensitive {redactedCount === 1 ? "value" : "values"} before building the prompt.
                    </p>
                </div>
            )}
        </div>
    );
};
