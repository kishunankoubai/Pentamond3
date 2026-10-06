import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputObserver } from "../Utilities/Interaction/InputObserver";

/** 本編・養成所共通の登録表示。登録後の遷移や配置の選択は呼び出し側に任せる。 */
export class InputRegistrationView {
    private requiredNumber = 1;

    constructor(private readonly pageId: string) {}

    static acceptsMenuInput(pageId: string, input: InputObserver): boolean {
        if (!document.getElementById(pageId)?.classList.contains("inputRegistrationPage")) return true;
        // 初めての押下は登録だけに使う。登録済みの機器では待機中も「戻る」を選べる。
        return !inputManager.g$registering || inputManager.g$registeredInputs.includes(input);
    }

    get ready(): boolean {
        const inputs = inputManager.g$registeredInputs;
        return inputs.length === this.requiredNumber && inputs.every((input) =>
            input.g$type === "keyboard" || input instanceof GamepadObserver && !!navigator.getGamepads?.()[input.g$index]?.connected);
    }

    reset(requiredNumber: number): void {
        this.requiredNumber = requiredNumber;
        this.render();
    }

    render(focusWhenReady = false): void {
        const page = document.getElementById(this.pageId);
        if (!page) return;
        const message = page.querySelector<HTMLElement>(".registrationMessage")!;
        const connections = page.querySelector<HTMLElement>(".registrationConnections")!;
        const next = page.querySelector<HTMLElement>(".registrationNext")!;
        const inputs = inputManager.g$registeredInputs;
        const ready = this.ready;
        message.textContent = ready ? "完了！" : `登録したい入力機器のボタンを押してください：あと${Math.max(0, this.requiredNumber - inputs.length)}人`;
        message.classList.toggle("registrationComplete", ready);
        connections.replaceChildren(...inputs.map((input, index) => {
            const icon = document.createElement("div");
            icon.className = "inputTypeIcon";
            icon.dataset.inputType = input.g$type;
            icon.setAttribute("role", "img");
            icon.setAttribute("aria-label", `プレイヤー${index + 1}：${input.g$type === "keyboard" ? "キーボード" : "コントローラー"}`);
            return icon;
        }));
        setInteractionEnabled(next, ready);
        if (ready && focusWhenReady) next.focus({ preventScroll: true });
    }
}
