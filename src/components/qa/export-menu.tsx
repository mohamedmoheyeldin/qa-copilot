import { useState } from "react";
import { ChevronDown, Download01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { type ExportFormat, exportDoc, exportFormats } from "@/lib/export";
import type { ExportDoc } from "@/lib/export/model";

interface ExportMenuProps {
    /** Built lazily so large documents are only assembled when someone exports. */
    getDoc: () => ExportDoc;
    label?: string;
    size?: "sm" | "md";
    color?: "primary" | "secondary";
}

/** One menu for PDF, Word, Excel, and Markdown, used by every tool. */
export const ExportMenu = ({ getDoc, label = "Export", size = "sm", color = "secondary" }: ExportMenuProps) => {
    const [busy, setBusy] = useState<ExportFormat | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (format: ExportFormat) => {
        setBusy(format);
        setError(null);
        try {
            await exportDoc(getDoc(), format);
        } catch (e) {
            setError(`Couldn't create the ${format.toUpperCase()} file: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex flex-col items-start gap-1">
            <Dropdown.Root>
                <Button size={size} color={color} iconLeading={Download01} iconTrailing={ChevronDown} isLoading={!!busy} data-testid="export-menu">
                    {busy ? `Exporting ${busy.toUpperCase()}` : label}
                </Button>
                <Dropdown.Popover className="w-64">
                    <Dropdown.Menu aria-label="Export format" onAction={(key) => run(key as ExportFormat)}>
                        {exportFormats.map((f) => (
                            <Dropdown.Item key={f.id} id={f.id} label={f.label} addon={f.hint} selectionIndicator="none" textValue={f.label} />
                        ))}
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            {error && (
                <p role="alert" className="text-sm text-error-primary">
                    {error}
                </p>
            )}
        </div>
    );
};
