import { inputManager } from "../Interaction/InputManager";
import { PageInteraction } from "../Interaction/PageInteraction";
import { initializeInteractionElements } from "../Element/InteractionElement";
import { initializePopupElement } from "../Element/PopupElement";
import type { InputInfo, InputObserver } from "../Interaction/InputObserver";

/** HTMLが読めない場合も、外部ファイルに依存せず復帰操作を表示する。 */
export class SceneRecovery {
    private static dismiss: (() => void) | null = null;

    static close(): void { this.dismiss?.(); }

    static show(canReturn: boolean): void {
        this.close();
        const overlay = document.createElement("div");
        overlay.id = "sceneRecovery";
        overlay.className = "page systemRecovery";
        overlay.style.display = "flex";
        overlay.style.zIndex = "2000";
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "画面の読み込みに失敗しました");
        overlay.innerHTML = '<div class="popup"><div class="label headingLabel">読み込みに失敗しました</div><div class="text">通信状態を確認してください。 再読み込みするとタイトルからやり直せます。 保存していないプレイは失われます。</div><div class="options"><div class="button" data-xy="[1,0]">再読み込み</div></div></div>';
        const buttons = [overlay.querySelector<HTMLElement>(".button")!];
        buttons[0].addEventListener("click", () => location.reload());
        const wasBlocked = PageInteraction.inputBlocked;
        PageInteraction.inputBlocked = true;
        const dispose = () => {
            inputManager.removeEvent(event);
            overlay.remove();
            PageInteraction.inputBlocked = wasBlocked;
            this.dismiss = null;
        };
        if (canReturn) {
            const back = document.createElement("div");
            back.className = "back button";
            back.dataset.xy = "[0,1]";
            back.textContent = "元の画面に戻る";
            back.addEventListener("click", dispose);
            overlay.querySelector(".popup")!.append(back);
            buttons.unshift(back);
        }
        const event = inputManager.addHandler("inputValid", ([input, info]: [InputObserver, InputInfo]) => {
            if (input.g$type === "autoKeyboard") return;
            info.consumed = true;
            const active = Math.max(0, buttons.indexOf(document.activeElement as HTMLElement));
            if (["Enter", "Space", "KeyZ", "button:1"].includes(info.name)) buttons[active].click();
            else if (["Escape", "KeyX", "Backspace", "button:0"].includes(info.name) && canReturn) dispose();
            else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD", "button:12", "button:13", "button:14", "button:15", "stick:-1", "stick:+1", "stick:-0", "stick:+0"].includes(info.name)) buttons[(active + 1) % buttons.length].focus();
        });
        this.dismiss = dispose;
        initializePopupElement(overlay);
        initializeInteractionElements(overlay);
        buttons.forEach((button) => button.addEventListener("mouseover", () => button.focus()));
        document.body.append(overlay);
        buttons[0].focus();
    }
}
