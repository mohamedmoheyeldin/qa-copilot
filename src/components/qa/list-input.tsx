import { useEffect, useState } from "react";
import { Input } from "@/components/base/input/input";

const toList = (s: string) =>
    s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

/** Comma-separated list input. Commits on blur so typing commas and spaces feels natural. */
export const ListInput = ({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) => {
    const [text, setText] = useState(value.join(", "));
    useEffect(() => setText(value.join(", ")), [value]);

    return <Input label={label} hint={hint ?? "Separate with commas"} value={text} onChange={setText} onBlur={() => onChange(toList(text))} />;
};
