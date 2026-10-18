import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
async function filesIn(path) {
    const entries = await readdir(new URL(path, root), { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        const name = `${path}${entry.name}`;
        return entry.isDirectory() ? filesIn(`${name}/`) : [name];
    }));
    return files.flat();
}

/** GitHub Pagesにはリポジトリ直下を公開するため、SWも直下に生成する。 */
export async function buildPWA() {
    const script = await readFile(new URL("dist/Run.js", root));
    const scriptVersion = createHash("sha256").update(script).digest("hex").slice(0, 16);
    const indexPath = new URL("index.html", root);
    const index = await readFile(indexPath, "utf8");
    await writeFile(indexPath, index.replace(/dist\/Run\.js\?v=[^"\s]+/, `dist/Run.js?v=${scriptVersion}`));

    const candidates = [
        "index.html", "manifest.webmanifest",
        ...await filesIn("css/"),
        ...await filesIn("src/HTML/"),
        ...await filesIn("dist/"),
        ...await filesIn("assets/"),
    ];
    const files = candidates.filter((name) => {
        if (name.startsWith("dist/")) return name.endsWith(".js");
        if (name.startsWith("assets/musics/")) return name.endsWith(".mp3");
        if (name.startsWith("assets/sounds/")) return /\/Pentamond[23]-.*\.mp3$/.test(name);
        return /\.(html|css|png|svg|ttf|txt|webmanifest)$/.test(name);
    }).sort();
    const template = await readFile(new URL("scripts/service-worker.template.js", root), "utf8");
    const hash = createHash("sha256").update(template);
    let size = 0;
    for (const name of files) {
        const data = await readFile(new URL(name, root));
        hash.update(name).update("\0").update(data);
        size += data.length;
    }
    const urls = files.map((path) => path.split("/").map(encodeURIComponent).join("/"));
    const output = template
        .replace("__CACHE_VERSION__", hash.digest("hex").slice(0, 20))
        .replace("__PRECACHE_URLS__", JSON.stringify(urls, null, 4));
    await writeFile(new URL("service-worker.js", root), output);
    console.log(`PWA: ${files.length} files, ${(size / 1024 / 1024).toFixed(1)} MiB → ${fileURLToPath(new URL("service-worker.js", root))}`);
}
