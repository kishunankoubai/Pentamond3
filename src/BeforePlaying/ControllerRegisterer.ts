import { inputManager } from "../Utilities/Interaction/InputManager";
import { qsAddEvent, qsAll } from "../Utils";

import * as Setting from "../Settings";
import { PlaySettingSetter } from "./PlaySettingSetter";
import { sceneManager } from "../Utilities/SceneManager";
import { MyEvent } from "../Utilities/MyEventListener";
import { ControllerSettingManager } from "../ControllerSettingManager";
import { PageManager } from "../Utilities/Page/PageManager";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { InputRegistrationView } from "./InputRegistrationView";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";

/**
 * コントローラーの登録をしたりする
 *  */
export class ControllerRegisterer {
    static gamepadConfigs: Setting.GamepadConfig[] = [];
    private static inputEvents: MyEvent[] = [];
    private static controller: AbortController | null = null;
    private static readonly registrationView = new InputRegistrationView("playerRegister");

    static setEvents() {
        this.clearEvents();
        this.controller = new AbortController();
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        // closure
        let currentPlayerNumber = 1;

        // コントローラーの登録の準備
        pageManager.addHandler(["openPage-playerRegister"], () => {
            const { playerNumber } = PlaySettingSetter.getPlaySetting();
            currentPlayerNumber = playerNumber;
            this.startControllerRegistration(currentPlayerNumber);
        });

        // キャンセル時
        qsAddEvent("#playerRegister .back", "click", () => {
            inputManager.resetRegister();
        });

        // キャンセル時
        qsAddEvent("#playPrepare .back", "click", () => {
            inputManager.resetRegister();
        });

        // 登録されたとき
        this.inputEvents.push(inputManager.addHandler("inputRegistered", () => {
            if (pageManager.g$currentPageId !== "playerRegister") return;
            // アイコンをだす
            this.onInputRegistered(currentPlayerNumber);
        }));

        this.inputEvents.push(inputManager.addHandler("finishRegister", () => {
            if (pageManager.g$currentPageId !== "playerRegister") return;
            this.registrationView.render(true);
        }));

        window.addEventListener("gamepaddisconnected", (event) => {
            if (pageManager.g$currentPageId !== "playerRegister") return;
            if (inputManager.g$registeredInputs.some((input) => input instanceof GamepadObserver && input.g$index === event.gamepad.index))
                this.startControllerRegistration(currentPlayerNumber);
        }, { signal: this.controller.signal });

        qsAddEvent("#registerButton", "click", () => {
            this.onClickOk(currentPlayerNumber);
        });
        qsAddEvent("#playPrepareControllerButton", "click", () => {
            const playerNumber = PlaySettingSetter.getPlaySetting().playerNumber;
            pageManager.openPage(playerNumber === 1 ? "controllerSetting" : "playerControllerSetting");
        });
        qsAddEvent("#playerControllerSetting .back", "click", () => {
            const playerNumber = PlaySettingSetter.getPlaySetting().playerNumber;
            this.gamepadConfigs = ControllerSettingManager.getPlayerConfigs(playerNumber);
        });
    }

    static clearEvents() {
        this.controller?.abort();
        this.controller = null;
        inputManager.removeEvent(this.inputEvents);
        this.inputEvents = [];
    }

    private static async onClickOk(playerNumber: number) {
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        // まだ全員登録し終わっていないならリターン
        if (inputManager.g$registering || !this.registrationView.ready) return;

        if (playerNumber > 1) {
            ControllerSettingManager.startPlayerSelection(playerNumber);
            this.gamepadConfigs = ControllerSettingManager.getPlayerConfigs(playerNumber);
            await this.openPlayPrepare("multiStageSelect");
            return;
        }

        await this.openPlayPrepare("soloStageSelect");
    }

    private static async openPlayPrepare(returnPageId: string) {
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        const backDepth = PageManager.getBackIndex(returnPageId);
        if (backDepth <= 0) return;

        inputManager.stop();

        this.enablePlayerRegisterButtons(false);
        try {
            if (await pageManager.backPage(backDepth, true)) pageManager.openPage("playPrepare");
        } finally {
            this.enablePlayerRegisterButtons(true);
            inputManager.start();
        }
    }

    private static enablePlayerRegisterButtons(available: boolean) {
        qsAll("#playerRegister .button").forEach((element) => {
            setInteractionEnabled(element, available);
        });
    }

    // normalを準備
    private static startControllerRegistration(playerNumber: number) {
        inputManager.removeVirtualInputs();
        this.gamepadConfigs = [];

        inputManager.s$maxInputNumber = playerNumber;
        inputManager.startRegister();
        this.registrationView.reset(playerNumber);
    }

    // コントローラーが登録されたときアイコンを出す
    private static onInputRegistered(playerNumber: number) {
        const registerInputs = inputManager.g$registeredInputs;
        const registeredInput = registerInputs.at(-1);
        // このイベントはタイトル画面の登録UI専用。別Sceneでは何もしない。
        if (!registeredInput) return;
        this.registrationView.render();

        this.gamepadConfigs.push(playerNumber === 1 ? ControllerSettingManager.getSelectedConfig() : structuredClone(Setting.gamepadConfigPresets[0]));
    }
}
