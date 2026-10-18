import { defineConfig } from "vite";
import { buildPWA } from "./scripts/build-pwa.mjs";

export default defineConfig({
    base: "./",
    plugins: [
        {
            name: "pentamond-development-entry",
            apply: "serve",
            // 公開用indexはdistを参照するが、開発時はDEV判定とHMRが有効なソースを使う。
            transformIndexHtml: {
                order: "pre",
                handler: (html) => html.replace(/src="(?:\.\/|\/)?dist\/Run\.js(?:\?v=[^"]*)?"/, 'src="src/Run.ts"'),
            },
        },
        { name: "pentamond-pwa", apply: "build", closeBundle: buildPWA },
    ],
    build: {
        target: ["es2022", "safari17.4", "firefox128"],
        rollupOptions: {
            input: "src/Run.ts", // run.jsのパス
            output: {
                entryFileNames: "Run.js",
                dir: "dist",
            },
        },
        sourcemap: true,
    },
});
