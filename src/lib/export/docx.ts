import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from "docx";
import type { ExportDoc } from "./model";

const BRAND = "7F56D9";

const lines = (text: string, opts: { font?: string; size?: number } = {}) =>
    text.split("\n").map((t, i) => new TextRun({ text: t, break: i > 0 ? 1 : 0, font: opts.font, size: opts.size }));

export const toDocx = async (d: ExportDoc): Promise<Blob> => {
    const children: (Paragraph | Table)[] = [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: d.title, bold: true })] }),
        ...(d.meta.length
            ? [
                  new Paragraph({
                      spacing: { after: 240 },
                      children: d.meta.flatMap(([k, v], i) => [new TextRun({ text: `${i ? "    " : ""}${k}: `, bold: true }), new TextRun(v)]),
                  }),
              ]
            : []),
    ];

    for (const b of d.blocks) {
        if (b.kind === "heading")
            children.push(
                new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun({ text: b.text, color: BRAND })] }),
            );
        if (b.kind === "paragraph") children.push(new Paragraph({ children: lines(b.text) }));
        if (b.kind === "list")
            b.items.forEach((item, i) =>
                children.push(new Paragraph({ children: [new TextRun(`${b.ordered ? `${i + 1}.` : "•"}  ${item}`)], indent: { left: 360 } })),
            );
        if (b.kind === "table") {
            const cell = (text: string, header = false) =>
                new TableCell({
                    shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: BRAND } : undefined,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [
                        new Paragraph({ children: header ? [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })] : lines(text, { size: 18 }) }),
                    ],
                });
            children.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ tableHeader: true, children: b.columns.map((c) => cell(c, true)) }),
                        ...b.rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) })),
                    ],
                }),
            );
        }
        if (b.kind === "code") {
            children.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: b.title, bold: true })] }));
            children.push(
                new Paragraph({
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F4F7" },
                    border: { left: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 8 } },
                    children: lines(b.text.trimEnd(), { font: "Consolas", size: 17 }),
                }),
            );
        }
    }

    children.push(
        new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
            children: [new TextRun({ text: "Generated with QA Copilot", italics: true, size: 16, color: "667085" })],
        }),
    );

    const wide = d.blocks.some((b) => b.kind === "table" && b.columns.length > 4);
    const doc = new Document({
        creator: "QA Copilot",
        title: d.title,
        styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
        sections: [{ properties: { page: { size: wide ? { orientation: PageOrientation.LANDSCAPE } : undefined } }, children }],
    });
    return Packer.toBlob(doc);
};
