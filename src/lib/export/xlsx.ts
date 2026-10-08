import writeXlsxFile from "write-excel-file/browser";
import type { ExportDoc } from "./model";

export const toXlsx = async (d: ExportDoc): Promise<Blob> => {
    const table = d.blocks.find((b) => b.kind === "table");
    const sheet =
        d.sheet ??
        (table?.kind === "table"
            ? { name: "Data", columns: table.columns, rows: table.rows, widths: table.widths }
            : { name: "Data", columns: ["Field", "Value"], rows: d.meta });

    const header = sheet.columns.map((value) => ({
        value,
        fontWeight: "bold" as const,
        color: "#FFFFFF",
        backgroundColor: "#7F56D9",
        alignVertical: "center" as const,
    }));
    const rows = sheet.rows.map((r) => r.map((value) => ({ value, wrap: true, alignVertical: "top" as const })));

    return writeXlsxFile([header, ...rows], {
        sheet: sheet.name.slice(0, 31),
        stickyRowsCount: 1,
        columns: sheet.columns.map((_, i) => ({ width: sheet.widths?.[i] ?? 24 })),
    }).toBlob();
};
