import { qsAddEvent } from "../Utils";
import { GameProcessing } from "./GameProcessing";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { PlaySettingSetter } from "../BeforePlaying/PlaySettingSetter";
import { sceneManager } from "../Utilities/SceneManager";
import { ScenePlay } from "../Scenes/ScenePlay";
import { PageManager } from "../Utilities/Page/PageManager";
import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import { ControllerSettingManager } from "../ControllerSettingManager";

export class GameStartEventSetter {
    static normal() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        // 「スタート!」
        qsAddEvent(".playStart", "click", async () => {
            const playSetting = PlaySettingSetter.getPlaySetting();
            if (playSetting.playerNumber === 1) {
                ControllerRegisterer.gamepadConfigs = [ControllerSettingManager.getSelectedConfig()];
            }
            await sceneManager.change(ScenePlay, false);
            await GameProcessing.startNormal(playSetting);
        });

        // ポーズ画面の「もう一度」・リザルト画面の「もう一度」
        qsAddEvent(".restart", "click", () => {
            pageManager.backPage(PageManager.getBackIndex("playPrepare"), true);
            GameProcessing.restartNormal();
        });

        // ポーズ画面の「再開する」
        qsAddEvent("#resumeButton", "click", () => {
            GameProcessing.resume();
        });
    }

    static result() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        qsAddEvent(".restart", "click", () => {
            pageManager.backPage(PageManager.getBackIndex("playPrepare"), true);
            GameProcessing.restartNormal();
        });
    }

    static replay() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        // replayを終了する
        qsAddEvent("#replayPause button:not(#replayResumeButton)", "click", () => {
            inputManager.removeVirtualInputs();
        });

        // ポーズ画面の「再開する」
        qsAddEvent("#replayResumeButton", "click", () => {
            GameProcessing.resume();
        });

        // ポーズ画面の「もう一度」・リザルト画面の「もう一度」
        qsAddEvent(".replayStart", "click", async () => {
            pageManager.backPage(2, true);
            GameProcessing.restartReplay();
        });
    }
}
