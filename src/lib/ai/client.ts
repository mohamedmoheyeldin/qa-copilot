import type { Prompt } from "../prompts";
import type { AiProvider, Settings } from "../types";

/** An AI call failed in a way the user can act on. `retryable` drives the Try again button. */
export class AiError extends Error {
    constructor(
        message: string,
        public retryable = true,
    ) {
        super(message);
        this.name = "AiError";
    }
}

export const providerInfo: Record<AiProvider, { label: string; keyPlaceholder: string; keyUrl?: string; needsKey: boolean }> = {
    anthropic: { label: "Anthropic (Claude)", keyPlaceholder: "sk-ant-...", keyUrl: "https://console.anthropic.com/settings/keys", needsKey: true },
    openai: { label: "OpenAI", keyPlaceholder: "sk-...", keyUrl: "https://platform.openai.com/api-keys", needsKey: true },
    gemini: { label: "Google Gemini", keyPlaceholder: "AIza...", keyUrl: "https://aistudio.google.com/apikey", needsKey: true },
    compatible: { label: "OpenAI-compatible (OpenRouter, Ollama, LM Studio, gateway)", keyPlaceholder: "Optional for local servers", needsKey: false },
};

const name = (s: Settings) => (s.provider === "compatible" ? hostOf(s.baseUrl) : providerInfo[s.provider].label.replace(/ \(.*\)$/, ""));
const hostOf = (url: string) => {
    try {
        return new URL(url).host;
    } catch {
        return "the endpoint";
    }
};

/** Turns HTTP failures into messages a tester can act on, instead of raw API errors. */
const explain = (status: number, providerMessage: string | undefined, s: Settings): AiError => {
    const p = name(s);
    if (status === 401 || status === 403) return new AiError(`${p} rejected the API key. Check it in Settings.`, false);
    if (status === 404) return new AiError(`${p} doesn't recognize the model "${s.model}". Use Load models in Settings to pick one your key can use.`, false);
    if (status === 429) return new AiError(`${p} is rate limiting this key, or its quota is used up. Wait a moment and try again.`);
    if (status === 400) return new AiError(`${p} couldn't process the request: ${providerMessage ?? "bad request"}`, false);
    if (status >= 500) return new AiError(`${p} is having trouble right now (${status}). Try again in a minute.`);
    return new AiError(providerMessage ?? `${p} returned an error (${status}).`);
};

const request = async (url: string, init: RequestInit, s: Settings) => {
    let res: Response;
    try {
        res = await fetch(url, init);
    } catch (e) {
        if ((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError") throw e;
        throw new AiError(
            s.provider === "compatible"
                ? `Couldn't reach ${hostOf(s.baseUrl)}. Check the base URL, that the server is running, and that it allows browser requests (CORS).`
                : `Couldn't reach ${name(s)}. Check your connection, VPN, or firewall.`,
        );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw explain(res.status, data?.error?.message ?? (typeof data?.error === "string" ? data.error : undefined), s);
    return data;
};

/** Output budget. Large suites with code need room, and a cut-off reply is invalid JSON. */
const MAX_TOKENS = 8192;
const TRUNCATED = "The AI ran out of room before finishing. Ask for fewer test cases and try again.";

const anthropicHeaders = (s: Settings) => ({
    "content-type": "application/json",
    "x-api-key": s.apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
});
const bearer = (s: Settings): Record<string, string> => ({ "content-type": "application/json", ...(s.apiKey ? { authorization: `Bearer ${s.apiKey}` } : {}) });
const openAiBase = (s: Settings) => (s.provider === "compatible" ? s.baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1");
const geminiBase = "https://generativelanguage.googleapis.com/v1beta";

const checkReady = (s: Settings) => {
    if (s.provider === "compatible" && !/^https?:\/\//.test(s.baseUrl))
        throw new AiError("Add the endpoint's base URL in Settings, for example https://openrouter.ai/api/v1.", false);
    if (providerInfo[s.provider].needsKey && !s.apiKey) throw new AiError("Add your API key in Settings to use this mode.", false);
    if (!s.model.trim()) throw new AiError("Choose a model in Settings. Load models shows the ones your key can use.", false);
};

/**
 * Calls the chosen AI provider directly from the browser (bring-your-own-key mode).
 * The key never leaves the browser except to go to that provider.
 */
export const callAi = async (prompt: Prompt, s: Settings, signal?: AbortSignal): Promise<string> => {
    checkReady(s);

    if (s.provider === "anthropic") {
        const data = await request(
            "https://api.anthropic.com/v1/messages",
            {
                method: "POST",
                signal,
                headers: anthropicHeaders(s),
                body: JSON.stringify({ model: s.model, max_tokens: MAX_TOKENS, system: prompt.system, messages: [{ role: "user", content: prompt.user }] }),
            },
            s,
        );
        if (data.stop_reason === "max_tokens") throw new AiError(TRUNCATED, false);
        return (data.content as { type: string; text?: string }[])
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n");
    }

    if (s.provider === "gemini") {
        const data = await request(
            `${geminiBase}/models/${encodeURIComponent(s.model)}:generateContent`,
            {
                method: "POST",
                signal,
                headers: { "content-type": "application/json", "x-goog-api-key": s.apiKey },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: prompt.system }] },
                    contents: [{ role: "user", parts: [{ text: prompt.user }] }],
                    generationConfig: { responseMimeType: "application/json", maxOutputTokens: MAX_TOKENS },
                }),
            },
            s,
        );
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === "MAX_TOKENS") throw new AiError(TRUNCATED, false);
        if (!candidate && data.promptFeedback?.blockReason)
            throw new AiError(`Gemini blocked the request (${data.promptFeedback.blockReason}). Try rewording the input.`, false);
        return (candidate?.content?.parts as { text?: string }[] | undefined)?.map((p) => p.text ?? "").join("") ?? "";
    }

    // OpenAI and OpenAI-compatible endpoints share the Chat Completions format.
    const data = await request(
        `${openAiBase(s)}/chat/completions`,
        {
            method: "POST",
            signal,
            headers: bearer(s),
            body: JSON.stringify({
                model: s.model,
                // JSON mode is OpenAI-specific. Compatible servers get the instruction in the prompt only.
                ...(s.provider === "openai" ? { response_format: { type: "json_object" } } : {}),
                messages: [
                    { role: "system", content: prompt.system },
                    { role: "user", content: prompt.user },
                ],
            }),
        },
        s,
    );
    if (data.choices?.[0]?.finish_reason === "length") throw new AiError(TRUNCATED, false);
    return data.choices?.[0]?.message?.content ?? "";
};

const NOT_CHAT = /(embed|audio|realtime|tts|transcribe|whisper|dall-e|image|moderation|search|davinci|babbage|instruct|aqa|imagen|veo)/i;

/**
 * Lists the models this key can use. Availability depends on the account, so asking the
 * provider is more reliable than shipping a hard-coded list that goes stale.
 */
export const listModels = async (s: Settings): Promise<string[]> => {
    if (s.provider === "compatible" && !/^https?:\/\//.test(s.baseUrl)) throw new AiError("Add the base URL first.", false);
    if (providerInfo[s.provider].needsKey && !s.apiKey) throw new AiError("Add your API key first.", false);
    const signal = AbortSignal.timeout(20000);

    if (s.provider === "anthropic") {
        const data = await request("https://api.anthropic.com/v1/models?limit=100", { signal, headers: anthropicHeaders(s) }, s);
        return (data.data as { id: string }[]).map((m) => m.id);
    }
    if (s.provider === "gemini") {
        const data = await request(`${geminiBase}/models?pageSize=200`, { signal, headers: { "x-goog-api-key": s.apiKey } }, s);
        return (data.models as { name: string; supportedGenerationMethods?: string[] }[])
            .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m) => m.name.replace(/^models\//, ""))
            .filter((id) => !NOT_CHAT.test(id));
    }
    const data = await request(`${openAiBase(s)}/models`, { signal, headers: bearer(s) }, s);
    const models = (data.data as { id: string; created?: number }[]).filter((m) => s.provider !== "openai" || !NOT_CHAT.test(m.id));
    return models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).map((m) => m.id);
};

/** A tiny request to confirm the key and model work, used by Settings > Test connection. */
export const testConnection = async (s: Settings): Promise<string> => {
    const raw = await callAi(
        { system: "You are a connection check. Reply with JSON only.", user: 'Reply with exactly {"ok": true}' },
        s,
        AbortSignal.timeout(30000),
    );
    if (!raw.includes("ok")) throw new AiError("Connected, but the reply was unexpected. This model may not follow JSON instructions well.");
    return `Connected to ${name(s)} with ${s.model}.`;
};
