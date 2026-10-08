import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { ExportDoc } from "./model";

const BRAND: [number, number, number] = [127, 86, 217];
const TEXT: [number, number, number] = [16, 24, 40];
const MUTED: [number, number, number] = [71, 84, 103];

export const toPdf = async (d: ExportDoc): Promise<Blob> => {
    const wide = d.blocks.some((b) => b.kind === "table" && b.columns.length > 4);
    const pdf = new jsPDF({ orientation: wide ? "landscape" : "portrait", unit: "pt", format: "letter" });
    const margin = 48;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const bottom = pdf.internal.pageSize.getHeight() - margin;
    let y = margin;

    const ensure = (h: number) => {
        if (y + h > bottom) {
            pdf.addPage();
            y = margin;
        }
    };
    const write = (text: string, size: number, color: [number, number, number], font: "normal" | "bold" = "normal", fontName = "helvetica", gap = 6) => {
        pdf.setFont(fontName, font)
            .setFontSize(size)
            .setTextColor(...color);
        for (const line of pdf.splitTextToSize(text, width) as string[]) {
            ensure(size * 1.35);
            pdf.text(line, margin, y + size);
            y += size * 1.35;
        }
        y += gap;
    };

    write(d.title, 18, TEXT, "bold");
    if (d.meta.length) write(d.meta.map(([k, v]) => `${k}: ${v}`).join("   |   "), 9.5, MUTED);
    pdf.setDrawColor(...BRAND)
        .setLineWidth(1.5)
        .line(margin, y, margin + width, y);
    y += 16;

    for (const b of d.blocks) {
        if (b.kind === "heading") {
            ensure(40);
            y += 4;
            write(b.text, 12.5, BRAND, "bold", "helvetica", 2);
        } else if (b.kind === "paragraph") write(b.text, 10.5, TEXT);
        else if (b.kind === "list") {
            b.items.forEach((item, i) => write(`${b.ordered ? `${i + 1}.` : "•"}  ${item}`, 10.5, TEXT, "normal", "helvetica", 2));
            y += 4;
        } else if (b.kind === "table") {
            autoTable(pdf, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [b.columns],
                body: b.rows,
                styles: { fontSize: 8.5, cellPadding: 5, valign: "top", textColor: TEXT, overflow: "linebreak" },
                headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
                alternateRowStyles: { fillColor: [249, 250, 251] },
            });
            y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
        } else if (b.kind === "code") {
            ensure(40);
            write(b.title, 10, MUTED, "bold", "helvetica", 2);
            write(b.text.trimEnd(), 8, TEXT, "normal", "courier", 10);
        }
    }

    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        pdf.setPage(i)
            .setFont("helvetica", "normal")
            .setFontSize(8)
            .setTextColor(...MUTED);
        pdf.text(`Generated with QA Copilot   |   Page ${i} of ${pages}`, margin, pdf.internal.pageSize.getHeight() - 24);
    }
    return pdf.output("blob");
};
