import { useCallback, useRef, useState } from "react";
import type { z } from "zod";
import { AiError, callAi } from "@/lib/ai/client";
import { parseWith } from "@/lib/ai/parse";
import { type Prompt, toPasteablePrompt } from "@/lib/prompts";
import { redact } from "@/lib/redact";
import { useSettings } from "@/lib/settings-context";

export type GeneratorStatus = "idle" | "loading" | "awaiting-paste" | "done" | "error";

interface Options<T> {
    schema: z.ZodType<T>;
    /** Builds the prompt from the (already redacted) input. */
    buildPrompt: (input: string) => Prompt;
    /** Returned in demo mode. Receives the raw input so each sample can show its own result. */
    demoResult: (input: string) => T;
    /**
     * Called once per successful generation with the input as it was sent to the AI
     * (redacted when redaction is on). Tools use this to save history.
     */
    onResult?: (result: T, sentInput: string) => void;
}

/**
 * Runs a generation in whichever AI mode the user picked:
 * demo (sample output), byok (direct API call), or prompt (copy/paste with any approved AI tool).
 */
export const useGenerator = <T>({ schema, buildPrompt, demoResult, onResult }: Options<T>) => {
    const { settings } = useSettings();
    const [status, setStatus] = useState<GeneratorStatus>("idle");
    const [result, setResultState] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [canRetry, setCanRetry] = useState(false);
    const [pasteablePrompt, setPasteablePrompt] = useState("");
    const [redactedCount, setRedactedCount] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const lastInput = useRef("");
    const sentInput = useRef("");

    const succeed = useCallback(
        (value: T) => {
            setResultState(value);
            setError(null);
            setStatus("done");
            onResult?.(value, sentInput.current);
        },
        [onResult],
    );

    const generate = useCallback(
        async (input: string) => {
            lastInput.current = input;
            setError(null);
            setCanRetry(false);
            const { text, count } = settings.redaction.enabled ? redact(input, settings.redaction.customTerms) : { text: input, count: 0 };
            setRedactedCount(count);
            sentInput.current = text;
            const prompt = buildPrompt(text);

            if (settings.aiMode === "demo") {
                setStatus("loading");
                await new Promise((r) => setTimeout(r, 600));
                succeed(demoResult(input));
                return;
            }

            if (settings.aiMode === "prompt") {
                setPasteablePrompt(toPasteablePrompt(prompt));
                setStatus("awaiting-paste");
                return;
            }

            abortRef.current?.abort();
            abortRef.current = new AbortController();
            setStatus("loading");
            try {
                const raw = await callAi(prompt, settings, abortRef.current.signal);
                succeed(parseWith(schema, raw));
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                setError((e as Error).message);
                // Bad keys and wrong model names won't fix themselves on retry. Everything else might.
                setCanRetry(e instanceof AiError ? e.retryable : true);
                setStatus("error");
            }
        },
        [settings, buildPrompt, demoResult, schema, succeed],
    );

    const retry = useCallback(() => generate(lastInput.current), [generate]);

    const submitPasted = useCallback(
        (raw: string) => {
            try {
                succeed(parseWith(schema, raw));
            } catch (e) {
                setError((e as Error).message);
            }
        },
        [schema, succeed],
    );

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setStatus(result ? "done" : "idle");
    }, [result]);

    /** Edits to the current result (does not count as a new generation). */
    const setResult = useCallback((value: T) => setResultState(value), []);

    /** Shows a saved result, for example one opened from history. */
    const restore = useCallback((value: T) => {
        setResultState(value);
        setError(null);
        setStatus("done");
    }, []);

    return {
        status,
        result,
        setResult,
        restore,
        error,
        canRetry,
        retry,
        pasteablePrompt,
        redactedCount,
        generate,
        submitPasted,
        cancel,
        mode: settings.aiMode,
    };
};
