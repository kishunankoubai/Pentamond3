import type { Scene } from "../Utilities/SceneManager";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { PlayData } from "../PlayData";

/** 全達成後、最初にタイトルへ戻ったときだけ、共通ポップアップでお祝いする。 */
export function setupAchievementCompletionNotice(scene: Scene, onClose: () => void): () => boolean {
    const manager = scene.g$pageManager;
    const page = document.getElementById("achievementCompletion")!;
    const close = page.querySelector<HTMLElement>(".back")!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (): boolean => {
        if (!page.isConnected || manager.g$currentPageId !== "title" || manager.getPage("title")!.g$element.style.display === "none" || !PlayData.needsAchievementCompletionNotice) return false;
        setInteractionEnabled(close, false);
        manager.openPage(page.id);
        PlayData.markAchievementCompletionNoticeShown();
        // マウス・決定・キャンセルすべての入力手段で3秒間は閉じられない。
        timer = setTimeout(() => {
            timer = undefined;
            if (!page.isConnected || manager.g$currentPageId !== page.id) return;
            setInteractionEnabled(close, true);
            close.focus();
        }, 3000);
        return true;
    };
    manager.addHandler("changePage-title", () => queueMicrotask(show));
    manager.addHandler(`closePage-${page.id}`, () => { clearTimeout(timer); timer = undefined; onClose(); });
    scene.addHandler("sceneEnd", () => clearTimeout(timer), 1);
    return show;
}
