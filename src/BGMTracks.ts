/** 曲の追加はこの一覧だけで行う。音源登録と各曲選択画面で共有する。ループ時刻の単位は秒。 */
export const bgmTracks = [
    { name: "つみきのおしろ", srcVolume: 0.8, loopStart: 0, loopEnd: 133.348 },
    { name: "ならべてトライアングル", srcVolume: 0.55, loopStart: 3.692, loopEnd: 143.98 },
    { name: "おかたづけ", srcVolume: 0.8, loopStart: 0, loopEnd: 90 },
    { name: "さよならさんかく", srcVolume: 0.7, loopStart: 0, loopEnd: 132.9 },
    { name: "Top of the Pyramid", srcVolume: 0.95, loopStart: 0, loopEnd: 108.896 },
] as const;

export function populateBGMSelectors(): void {
    for (const id of ["bgmSelector1", "bgmSelector2", "soundTestSelector"]) {
        const page = document.getElementById(id);
        const container = page?.querySelector(".scrollableContainer");
        if (!container) continue;
        container.replaceChildren(
            ...bgmTracks.map(({ name }, index) => {
                const option = document.createElement("div");
                option.className = "button";
                option.dataset.xy = `[0,${index}]`;
                option.dataset.soundTrack = name;
                option.textContent = name;
                if (id === "soundTestSelector" && index === 0) option.classList.add("selectedValue");
                return option;
            })
        );
        const back = page?.querySelector<HTMLElement>(".back");
        if (back) back.dataset.xy = `[0,${bgmTracks.length}]`;
    }
}
