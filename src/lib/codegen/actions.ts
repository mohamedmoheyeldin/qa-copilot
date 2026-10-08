/**
 * Turns plain-English test steps into a small set of actions every framework can render.
 * Anything it can't interpret confidently becomes a TODO comment instead of a guess.
 */

export type Action =
    | { kind: "goto"; path: string }
    | { kind: "click"; name: string; role?: "button" | "link" }
    | { kind: "fill"; field: string; value: string }
    | { kind: "expectText"; text: string }
    | { kind: "expectAlert" }
    | { kind: "expectUrl"; path: string }
    | { kind: "todo"; text: string };

export const slug = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "item";

const quoted = (s: string) => s.match(/["'“‘]([^"'”’]+)["'”’]/)?.[1];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const knownFields = [
    "confirm password",
    "new password",
    "password",
    "email",
    "username",
    "name",
    "phone",
    "coupon code",
    "coupon",
    "code",
    "search",
    "quantity",
    "address",
];

/** Keeps values consistent within one test (the confirm field gets the same password). */
export interface StepState {
    lastPassword?: string;
}

const sampleValue = (field: string, step: string, state: StepState): string => {
    const explicit = quoted(step);
    if (explicit) return explicit;
    const f = field.toLowerCase();
    if (f.includes("confirm") && state.lastPassword) return state.lastPassword;
    if (f.includes("password")) {
        const len = Number(step.match(/(\d+)\s*\+?\s*(?:-\s*)?char/i)?.[1] ?? 14);
        const base = "Str0ng!Passw0rd#2026";
        const value = base.length >= len ? base.slice(0, len) : base.padEnd(len, "x");
        state.lastPassword = value;
        return value;
    }
    if (f.includes("email")) return /invalid|not an email|wrong format/i.test(step) ? "not-an-email" : "registered.user@example.com";
    if (f.includes("coupon") || f === "code") return /expired/i.test(step) ? "EXPIRED10" : /invalid/i.test(step) ? "NOTACODE" : "SAVE10";
    if (f.includes("quantity")) return "2";
    if (f.includes("phone")) return "555-0100";
    if (f.includes("search")) return "headphones";
    return "Test value";
};

export const toAction = (step: string, state: StepState = {}): Action => {
    const s = step.trim().replace(/\.$/, "");

    const nav =
        s.match(/^(?:open|go to|navigate to|visit|load)\s+(?:the\s+)?(.+?)\s+(page|screen)$/i) ?? s.match(/^(?:go to|navigate to|visit)\s+(?:the\s+)?(.+)$/i);
    if (nav) return { kind: "goto", path: `/${slug(nav[1])}` };

    const click = s.match(/^(?:click|tap|press|select)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+(button|link))?$/i);
    if (click) {
        const name = quoted(click[1]) ?? capitalize(click[1].replace(/["'“”]/g, ""));
        return { kind: "click", name, role: click[2]?.toLowerCase() as "button" | "link" | undefined };
    }

    if (/^(submit|save|send)(\s+the\s+form)?$/i.test(s)) return { kind: "click", name: /save/i.test(s) ? "Save" : "Submit", role: "button" };

    const fill = s.match(/^(?:enter|type|fill in|fill|input|confirm)\s+(.+)$/i);
    if (fill) {
        const lower = s.toLowerCase();
        let field = knownFields.find((f) => lower.includes(f));
        if (/^confirm/i.test(s) && field === "password") field = "confirm password";
        if (field) return { kind: "fill", field: capitalize(field), value: sampleValue(field, s, state) };
    }

    return { kind: "todo", text: step.trim() };
};

/** Maps an expected result to an assertion when it clearly names one, otherwise a TODO. */
export const toAssertion = (expected: string): Action => {
    const text = quoted(expected);
    if (text) return { kind: "expectText", text };
    if (/\b(error|rejected|invalid|not allowed|expired|denied|fails?)\b/i.test(expected)) return { kind: "expectAlert" };
    const page = expected.match(/(?:redirected|taken|navigates?)\s+to\s+(?:the\s+)?(.+?)\s+page/i);
    if (page) return { kind: "expectUrl", path: `/${slug(page[1])}` };
    return { kind: "todo", text: `Verify: ${expected.trim()}` };
};
