import { Button } from "@/components/base/buttons/button";

export interface Sample {
    id: string;
    label: string;
}

/** "Try a sample" buttons shown above every tool's input. */
export const SamplePicker = <T extends Sample>({ samples, onPick }: { samples: T[]; onPick: (sample: T) => void }) => (
    <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-tertiary">Try a sample:</span>
        {samples.map((s) => (
            <Button key={s.id} size="sm" color="secondary" onClick={() => onPick(s)}>
                {s.label}
            </Button>
        ))}
    </div>
);
