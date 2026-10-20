import { sceneManager, type Scene } from "../Utilities/Scene/SceneManager";
import type { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { EventScope } from "../Utilities/Event/EventScope";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { PageNotice } from "../Utilities/Feedback/PageNotice";
import { SceneRecovery } from "../Utilities/Feedback/SceneRecovery";
import { spaceJapaneseTextNodes } from "../Utilities/Text/JapaneseText";

/** 共通システムの操作通知に、このゲームのSEを結び付ける。シーン終了時に購読を解除する。 */
export function setupMenuFeedback(interaction: PageInteraction): void {
    const events = new EventScope();
    events.add(
        interaction.addHandler("focus", () => {
            MusicManager.get("フォーカス")?.play();
        }),
        interaction.addHandler("activate", (element: HTMLElement) => {
            const sound = element.closest(".subPagePrev, .subPageNext") ? "サブページボタン" : "ボタン";
            MusicManager.get(sound)?.play();
        })
    );
    interaction.g$scene.addHandler("sceneEnd", () => events.dispose(), 1);
}

let initialized = false;
export function setupPresentation(): void {
    if (initialized) return;
    initialized = true;
    sceneManager.addHandler("sceneHTMLLoaded", spaceJapaneseTextNodes);
    PageNotice.setDeferredPages(["pageStart", "play", "startEffect", "practice", "talk"]);
    SceneRecovery.reloadMessage = "通信状態を確認してください。 再読み込みするとタイトルからやり直せます。 保存していないプレイは失われます。";
}

/** ページ内容を読みにくくする拡大・ぼかしを避け、短い移動とフェードで統一する。 */
export function applyPageTransitions(scene: Scene): void {
    scene.g$pageManager.g$pages.forEach((page) => {
        const popup = !!page.g$element.querySelector(".popup") || page.g$element.classList.contains("pauseMenu");
        page.setOpenAnimation(
            [
                { opacity: 0, transform: popup ? "translateY(0.6cqh)" : "translateX(1cqh)" },
                { opacity: 1, transform: "none" },
            ],
            { duration: popup ? 160 : 200, easing: "ease-out", iterations: 1 }
        );
        page.setCloseAnimation(
            [
                { opacity: 1, transform: "none" },
                { opacity: 0, transform: popup ? "translateY(0.3cqh)" : "translateX(-0.5cqh)" },
            ],
            { duration: 120, easing: "ease-in", iterations: 1 }
        );
    });
}
