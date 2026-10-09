/** 曲の追加はこの一覧だけで行う。音源登録と各曲選択画面で共有する。 */
export const bgmTracks = [
    { name: "つみきのおしろ", srcVolume: 0.8 },
    { name: "ならべてトライアングル", srcVolume: 0.6 },
    { name: "おかたづけ", srcVolume: 0.8 },
    { name: "さよならさんかく", srcVolume: 0.8 },
    { name: "Top of the Pyramid", srcVolume: 0.8 },
] as const;

export function populateBGMSelectors(): void {
    for (const id of ["bgmSelector1", "bgmSelector2", "soundTestSelector"]) {
        const page = document.getElementById(id);
        const container = page?.querySelector(".scrollableContainer");
        if (!container) continue;
        container.replaceChildren(...bgmTracks.map(({ name }, index) => {
            const option = document.createElement("div");
            option.className = "button";
            option.dataset.xy = `[0,${index}]`;
            option.dataset.soundTrack = name;
            option.textContent = name;
            if (id === "soundTestSelector" && index === 0) option.classList.add("selectedValue");
            return option;
        }));
        const back = page?.querySelector<HTMLElement>(".back");
        if (back) back.dataset.xy = `[0,${bgmTracks.length}]`;
    }
}
