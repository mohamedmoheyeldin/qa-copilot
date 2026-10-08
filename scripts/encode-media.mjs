// Converts captured PNGs and the recorded video into small WebP files for the README. Needs ffmpeg on PATH.
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";

const dir = "docs/media";
for (const f of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", `${dir}/${f}`, "-vf", "scale=1440:-1", "-quality", "80", `${dir}/${f.replace(".png", ".webp")}`]);
    rmSync(`${dir}/${f}`);
}
const video = readdirSync(`${dir}/raw`).find((f) => f.endsWith(".webm"));
execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${dir}/raw/${video}`,
    "-vf",
    "fps=8,scale=960:-1:flags=lanczos",
    "-loop",
    "0",
    "-quality",
    "55",
    "-c:v",
    "libwebp_anim",
    `${dir}/demo.webp`,
]);
rmSync(`${dir}/raw`, { recursive: true });
