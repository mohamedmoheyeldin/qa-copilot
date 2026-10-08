import type { GeneratedFile } from "../types";
import { type ExportDoc, docToMarkdown } from "./model";

export type ExportFormat = "pdf" | "docx" | "xlsx" | "md";

export const exportFormats: { id: ExportFormat; label: string; hint: string }[] = [
    { id: "pdf", label: "PDF", hint: "Share or print" },
    { id: "docx", label: "Word", hint: "Edit in Word or Google Docs" },
    { id: "xlsx", label: "Excel", hint: "Import into a test management tool" },
    { id: "md", label: "Markdown", hint: "GitHub, GitLab, wikis" },
];

export const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Renders and downloads a document. Heavy libraries load only when someone exports. */
export const exportDoc = async (doc: ExportDoc, format: ExportFormat) => {
    if (format === "md") return saveBlob(new Blob([docToMarkdown(doc)], { type: "text/markdown" }), `${doc.fileName}.md`);
    if (format === "pdf") return saveBlob(await (await import("./pdf")).toPdf(doc), `${doc.fileName}.pdf`);
    if (format === "docx") return saveBlob(await (await import("./docx")).toDocx(doc), `${doc.fileName}.docx`);
    return saveBlob(await (await import("./xlsx")).toXlsx(doc), `${doc.fileName}.xlsx`);
};

/** Bundles generated code files into one zip, keeping their folder structure. */
export const exportZip = async (files: GeneratedFile[], fileName: string) => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    saveBlob(await zip.generateAsync({ type: "blob" }), `${fileName}.zip`);
};
