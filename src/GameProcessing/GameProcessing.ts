import { Mode1 } from "../Game/Modes/Mode1";
import { Mode2 } from "../Game/Modes/Mode2";
import { Input } from "../Interaction/Input";
import { inputManager } from "../Interaction/InputManager";
import { playBackground } from "../PlayBackground";
import { Replay, ReplayData } from "../Replay/Replay";
import { DisposableGame } from "./DisposableGame";
import { ResultPageHandler } from "../ResultPageHandler";
import { countDown } from "./countDown";
import { qs } from "../Utils";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { sceneManager } from "../Utilities/SceneManager";
import { SceneResult } from "../Scenes/SceneResult";

//ゲーム開始
export class GameProcessing {
    private static readonly ModeClassList = [Mode1, Mode2];

    static currentGame: DisposableGame | null = null;

    static resume() {
        if (!this.currentGame) throw new Error("プレイ中ではない");
        this.currentGame.game.start();
    }

    static isReplaying(): this is GameProcessing & { currentGame: DisposableGame & { replayData: ReplayData } } {
        return !!this.currentGame?.isReplay();
    }

    /**
     * 前回の設定と同じでプレイする
     */
    static restartNormal() {
        if (!this.currentGame) throw new Error("一度もプレイされていない");
        this.startNormal(this.currentGame.playSetting);
    }

    /**
     * 前回の設定と同じでリプレイする
     */
    static restartReplay() {
        if (!this.isReplaying()) throw new Error("リプレイ中ではない");
        this.startReplay(this.currentGame.replayData);
    }

    static async startNormal(playSetting: PlaySetting) {
        this.beforeStart();

        this.currentGame = new DisposableGame(
            this.ModeClassList,
            inputManager.g$registeredInputs,
            inputManager.g$maxInputNumber,

            { playSetting }
        );

        this.currentGame.onFinished = () => {
            this.onFinishNormal();
        };

        this.currentGame.appendPlayersTo(qs("#play"));

        await this.countDownAndStart();
    }

    static async startReplay(replayData: ReplayData) {
        this.beforeStart();

        this.setupReplayInputs(replayData);

        this.currentGame = new DisposableGame(
            this.ModeClassList,
            inputManager.g$registeredInputs,
            inputManager.g$maxInputNumber,

            { replayData }
        );

        this.currentGame.onFinished = () => {
            this.onFinishReplay();
        };

        this.currentGame.appendPlayersTo(qs("#play"));

        await this.countDownAndStart();

        this.startAutoPlay();
    }

    private static setupReplayInputs(replayData: ReplayData) {
        inputManager.removeVirtualInputs();
        inputManager.resetRegister();
        inputManager.s$maxInputNumber = replayData.playSetting.playerNumber;

        const playerNumber = replayData.playSetting.playerNumber;
        for (let i = 0; i < playerNumber; i++) {
            const input = new Input("autoKeyboard");

            if (!input.isAuto()) throw new Error("inputが自動ではありません");

            input.g$manager.s$inputData = replayData.inputData[i];
            inputManager.register(input);
        }
    }

    private static startAutoPlay() {
        inputManager.g$registeredInputs.forEach((input) => {
            if (!input.isAuto()) throw new Error("inputが自動ではありません");

            input.g$manager.playReset();
            input.g$manager.playStart();
        });
    }

    private static async onFinishNormal() {
        // pageManager.setPage("result");
        await sceneManager.change(SceneResult);
        inputManager.removeVirtualInputs();

        Replay.addTempData(this.currentGame!);
        ResultPageHandler.setSaveButton();
        ResultPageHandler.updateDetailedResultPage(this.currentGame!);
    }

    private static onFinishReplay() {
        //後で修正
        // pageManager.setPage("replayResult");
        inputManager.removeVirtualInputs();

        ResultPageHandler.OverWriteTime(this.currentGame!.replayData!.finishTime);
        ResultPageHandler.updateDetailedResultPage(this.currentGame!);
    }

    private static async countDownAndStart() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        //開始演出
        await countDown(["", "3", "2", "1", "START!"]);

        this.currentGame!.start();

        pageManager.backPage(1);
    }

    private static beforeStart() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        if (this.currentGame) this.currentGame.quit();

        // 背景をリセット
        playBackground.reset();

        // ページ移動
        pageManager.openPage("play", true);
        pageManager.openPage("startEffect");
    }
}
