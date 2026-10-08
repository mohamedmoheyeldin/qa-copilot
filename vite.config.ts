import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// base "./" makes the build work on GitHub Pages under any repo name (and on a custom domain).
// Routing uses HashRouter, so no 404.html redirect trick is needed.
export default defineConfig({
    base: "./",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
