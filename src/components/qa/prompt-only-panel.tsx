import { useState } from "react";
import { Check, Copy01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { useClipboard } from "@/hooks/use-clipboard";
import { Panel } from "./page-header";

interface Props {
    prompt: string;
    error: string | null;
    onSubmit: (raw: string) => void;
}

/** Prompt-only mode: copy the prompt into any approved AI tool, then paste the answer back. */
export const PromptOnlyPanel = ({ prompt, error, onSubmit }: Props) => {
    const clipboard = useClipboard();
    const [response, setResponse] = useState("");

    return (
        <Panel title="Use your approved AI tool">
            <ol className="flex flex-col gap-5">
                <li className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-secondary">1. Copy this prompt into your AI tool</p>
                        <Button size="sm" color="secondary" iconLeading={clipboard.copied ? Check : Copy01} onClick={() => clipboard.copy(prompt)}>
                            {clipboard.copied ? "Copied" : "Copy prompt"}
                        </Button>
                    </div>
                    <pre className="max-h-56 overflow-auto rounded-lg bg-secondary p-3 font-mono text-xs whitespace-pre-wrap text-secondary">{prompt}</pre>
                </li>
                <li className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-secondary">2. Paste the AI's answer here</p>
                    <TextArea
                        aria-label="AI response"
                        rows={6}
                        value={response}
                        onChange={setResponse}
                        placeholder='{"title": "..."}'
                        isInvalid={!!error}
                        hint={error ?? undefined}
                    />
                    <div>
                        <Button size="md" onClick={() => onSubmit(response)} isDisabled={!response.trim()}>
                            Format answer
                        </Button>
                    </div>
                </li>
            </ol>
        </Panel>
    );
};
