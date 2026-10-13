import type { Scene } from "../SceneManager";

/** ページ内容を読みにくくする拡大・ぼかしを避け、短い移動とフェードで統一する。 */
export function applyPageTransitions(scene: Scene): void {
    scene.g$pageManager.g$pages.forEach((page) => {
        const popup = !!page.g$element.querySelector(".popup") || page.g$element.classList.contains("pauseMenu");
        page.setOpenAnimation([
            { opacity: 0, transform: popup ? "translateY(0.6cqh)" : "translateX(1cqh)" },
            { opacity: 1, transform: "none" },
        ], { duration: popup ? 160 : 200, easing: "ease-out", iterations: 1 });
        page.setCloseAnimation([
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: popup ? "translateY(0.3cqh)" : "translateX(-0.5cqh)" },
        ], { duration: 120, easing: "ease-in", iterations: 1 });
    });
}
