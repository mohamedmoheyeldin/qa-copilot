export interface RedactionResult {
    text: string;
    count: number;
}

const builtInRules: { label: string; pattern: RegExp }[] = [
    { label: "EMAIL", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
    { label: "PHONE", pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g },
    { label: "IP", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
    { label: "URL", pattern: /https?:\/\/[^\s)"'<>]+/gi },
    { label: "TOKEN", pattern: /\b(?:Bearer\s+)?[A-Za-z0-9_-]{32,}\b/g },
    { label: "ID", pattern: /\b\d{7,}\b/g },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Masks common sensitive values before anything leaves the browser. */
export const redact = (input: string, customTerms: string[] = []): RedactionResult => {
    let count = 0;
    let text = input;

    for (const term of customTerms.map((t) => t.trim()).filter(Boolean)) {
        text = text.replace(new RegExp(escapeRegExp(term), "gi"), () => {
            count++;
            return "[REDACTED]";
        });
    }

    for (const { label, pattern } of builtInRules) {
        text = text.replace(pattern, () => {
            count++;
            return `[${label}]`;
        });
    }

    return { text, count };
};
