import type { Scene } from "../Utilities/Scene/SceneManager";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { PlayData } from "../Storage/PlayData";

/** 全達成後、最初にタイトルへ戻ったときだけ表示する*/
export function setupAchievementCompletionNotice(scene: Scene, onClose: () => void): () => boolean {
    const manager = scene.g$pageManager;
    const page = document.getElementById("achievementCompletion")!;
    const close = page.querySelector<HTMLElement>(".back")!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (): boolean => {
        if (!page.isConnected || manager.g$currentPageId !== "title" || manager.getPage("title")!.g$element.style.display === "none" || !PlayData.g$needsAchievementCompletionNotice) return false;
        setInteractionEnabled(close, false);
        manager.openPage(page.id);
        PlayData.markAchievementCompletionNoticeShown();
        // 3秒間は閉じないようにする
        timer = setTimeout(() => {
            timer = undefined;
            if (!page.isConnected || manager.g$currentPageId !== page.id) return;
            setInteractionEnabled(close, true);
            close.focus();
        }, 3000);
        return true;
    };
    manager.addHandler("changePage-title", () => queueMicrotask(show));
    manager.addHandler(`closePage-${page.id}`, () => {
        clearTimeout(timer);
        timer = undefined;
        onClose();
    });
    scene.addHandler("sceneEnd", () => clearTimeout(timer), 1);
    return show;
}
