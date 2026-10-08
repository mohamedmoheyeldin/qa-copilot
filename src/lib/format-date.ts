const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Infinity],
];

/** "just now", "5 minutes ago", "yesterday", ... */
export const timeAgo = (iso: string, now = Date.now()) => {
    let value = (new Date(iso).getTime() - now) / 1000;
    if (Math.abs(value) < 45) return "just now";
    value /= 60;
    for (const [unit, size] of steps) {
        if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
        value /= size;
    }
    return new Date(iso).toLocaleDateString();
};
