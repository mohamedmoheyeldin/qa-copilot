import { z } from "zod";

/** Pulls the first JSON object out of a model response, tolerating code fences and stray text. */
export const extractJson = (text: string): unknown => {
    const cleaned = text.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1) throw new Error("The response doesn't contain a JSON object. Make sure you pasted the whole answer.");
    if (end <= start) throw new Error("The JSON in the response is cut off. The AI may have run out of room, so ask for fewer items.");
    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
        throw new Error("The response looks like JSON but has a syntax error. Try generating again.");
    }
};

export const bugReportSchema = z.object({
    title: z.string(),
    summary: z.string().default(""),
    steps: z.array(z.string()).default([]),
    expected: z.string().default(""),
    actual: z.string().default(""),
    environment: z.string().default(""),
    severity: z.string().default(""),
    priority: z.string().default(""),
    possibleCause: z.string().optional(),
    regressionTest: z.string().optional(),
    customFields: z.record(z.string(), z.string()).optional(),
});

const testGenShape = z.object({
    assumptions: z.array(z.string()).default([]),
    cases: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            type: z.enum(["happy", "negative", "edge", "accessibility", "api"]).catch("happy"),
            priority: z.enum(["high", "medium", "low"]).catch("medium"),
            preconditions: z.string().optional(),
            steps: z.array(z.string()).default([]),
            expected: z.string().default(""),
        }),
    ),
    files: z.array(z.object({ path: z.string(), content: z.string() })).default([]),
    /** Older single-file replies. Converted to `files` by normalizeTestResult. */
    code: z.string().optional(),
});

export const testGenSchema = testGenShape.transform((r) => normalizeTestResult(r));

export const filesSchema = z.object({ files: z.array(z.object({ path: z.string(), content: z.string() })).min(1) });

/** Accepts both the current `files` shape and the older single `code` string. */
export const normalizeTestResult = <T extends { files?: { path: string; content: string }[]; code?: string }>(r: T, fallbackPath = "generated.spec.ts") => {
    const { code, ...rest } = r;
    const files = rest.files?.length ? rest.files : code ? [{ path: fallbackPath, content: code }] : [];
    return { ...rest, files };
};

export const parseWith = <T>(schema: z.ZodType<T>, text: string): T => {
    const result = schema.safeParse(extractJson(text));
    if (!result.success) {
        const where = result.error.issues
            .slice(0, 3)
            .map((i) => i.path.join(".") || "root")
            .join(", ");
        throw new Error(`The response JSON is missing or has wrong fields (${where}). Try generating again.`);
    }
    return result.data;
};
