/** シーンを離れた場合は、カウントダウンの後続処理を残さない。 */
export function countDown(countStrings: string[], signal?: AbortSignal): Promise<void> {
    const container = document.getElementById("startEffectBase");
    if (!container || signal?.aborted) return Promise.resolve();
    const remaining = [...countStrings];
    return new Promise((resolve) => {
        let label: HTMLElement | undefined;
        const finish = () => {
            label?.remove();
            signal?.removeEventListener("abort", finish);
            resolve();
        };
        const next = () => {
            if (signal?.aborted || !container.isConnected || !remaining.length) { finish(); return; }
            label = document.createElement("div");
            label.className = "startEffectLabel";
            label.textContent = remaining.shift()!;
            if (!remaining.length) label.id = "startLabel";
            container.appendChild(label);
            label.addEventListener("animationend", () => { label?.remove(); next(); }, { once: true, signal });
        };
        signal?.addEventListener("abort", finish, { once: true });
        next();
    });
}
