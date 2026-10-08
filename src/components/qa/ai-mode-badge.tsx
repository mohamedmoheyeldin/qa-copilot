import { BadgeWithDot } from "@/components/base/badges/badges";
import { useSettings } from "@/lib/settings-context";

const labels = { demo: "Demo mode", byok: "Your API key", prompt: "Prompt only" } as const;
const colors = { demo: "gray", byok: "success", prompt: "brand" } as const;

export const AiModeBadge = () => {
    const { settings } = useSettings();
    return (
        <BadgeWithDot type="pill-color" size="sm" color={colors[settings.aiMode]}>
            {labels[settings.aiMode]}
        </BadgeWithDot>
    );
};
