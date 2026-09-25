import { inputManager } from "../Interaction/InputManager";
import { qs, qsAddEvent, qsAll, sleep } from "../Utils";

import * as Setting from "../Settings";
import { debug } from "../Run";
import { PlaySettingSetter } from "./PlaySettingSetter";
import { sceneManager } from "../Utilities/SceneManager";

/**
 * コントローラーの登録をしたりする
 *  */
export class ControllerRegisterer {
    static gamepadConfigs: Setting.GamepadConfig[] = [];

    static setEvents() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        // closure
        let currentPlayerNumber = 1;

        // コントローラーの登録の準備
        pageManager.addHandler(["openPage-playerRegister"], async () => {
            // なぜかPlaySettingSetterよりもこっちが早く反応するから遅らせる
            await sleep(1);
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
        inputManager.addEvent(["inputRegistered"], () => {
            // アイコンをだす
            this.onInputRegistered(currentPlayerNumber);
        });

        inputManager.addEvent(["finishRegister"], () => {
            qs("#registerText").innerHTML = '<div style="color:#d66">完了！</div>';
        });

        qsAddEvent("#registerButton", "click", () => {
            this.onClickOk(currentPlayerNumber);
        });
    }

    private static async onClickOk(playerNumber: number) {
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        // まだ全員登録し終わっていないならリターン
        if (inputManager.g$registering) {
            if (debug) {
                inputManager.finishRegister();
            } else return;
        }

        inputManager.stop();

        this.enablePlayerRegisterButtons(false);

        // 何のため?
        // await sleep(500);

        const backDepth = playerNumber == 1 ? 1 : 2;
        pageManager.backPage(backDepth, true);
        pageManager.openPage("playPrepare");

        this.enablePlayerRegisterButtons(true);

        inputManager.start();
    }

    private static enablePlayerRegisterButtons(available: boolean) {
        qsAll("#playerRegister button").forEach((element) => {
            (element as HTMLButtonElement).disabled = !available;
        });
    }

    // normalを準備
    private static startControllerRegistration(playerNumber: number) {
        // 既に登録されているものを外す
        if (inputManager.g$registeredInputNumber > 0) {
            inputManager.removeVirtualInputs();
            inputManager.resetRegister();
        }

        // 前の表示を消す
        Array.from(qs("#connectionLabel").children).forEach((element) => {
            element.remove();
        });

        qs("#registerText").innerText = `登録したい入力機器のボタンを押してください：あと${playerNumber - inputManager.g$registeredInputNumber}人`;

        this.gamepadConfigs = [];

        inputManager.s$maxInputNumber = playerNumber;
        inputManager.startRegister();
    }

    // コントローラーが登録されたときアイコンを出す
    private static onInputRegistered(playerNumber: number) {
        const registerInputs = inputManager.g$registeredInputs;

        const typeIcon = document.createElement("div");
        typeIcon.dataset.inputType = registerInputs[registerInputs.length - 1].g$type;
        typeIcon.classList.add("inputTypeIcon");
        // typeIcon.innerHTML = registerInputs[registerInputs.length - 1].g$type;
        qs("#connectionLabel").appendChild(typeIcon);

        qs("#registerText").innerText = `登録したい入力機器のボタンを押してください：あと${playerNumber - inputManager.g$registeredInputNumber}人`;

        this.gamepadConfigs.push(Setting.gamepadConfigPresets[0]);
    }
}
