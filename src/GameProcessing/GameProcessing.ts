import { Mode1 } from "../Game/Modes/Mode1";
import { Mode2 } from "../Game/Modes/Mode2";
import { AutoInputObserver } from "../Utilities/Interaction/AutoInputObserver";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { playBackground } from "../PlayBackground";
import { Replay, ReplayData } from "../Replay/Replay";
import { DisposableGame } from "./DisposableGame";
import { ResultPageHandler } from "../ResultPageHandler";
import { countDown } from "./countDown";
import { qs } from "../Utils";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { sceneManager } from "../Utilities/SceneManager";
import { SceneResult } from "../Scenes/SceneResult";
import { SceneReplay } from "../Scenes/SceneReplay";
import { ScenePlay } from "../Scenes/ScenePlay";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import * as Setting from "../Settings";

//ゲーム開始
export class GameProcessing {
    private static readonly ModeClassList = [Mode1, Mode2];

    static currentGame: DisposableGame | null = null;

    static resume() {
        if (!this.currentGame) throw new Error("プレイ中ではない");
        this.currentGame.game.start();
    }

    static pause() {
        if (!this.currentGame || this.currentGame.g$hasFinished) return;
        this.currentGame.game.stop();
    }

    static quit() {
        this.currentGame?.quit();
        this.currentGame = null;
        inputManager.removeVirtualInputs();
    }

    static isReplaying(): this is GameProcessing & { currentGame: DisposableGame & { replayData: ReplayData } } {
        return !!this.currentGame?.isReplay();
    }

    /**
     * 前回の設定と同じでプレイする
     */
    static async restartNormal() {
        if (!this.currentGame) throw new Error("一度もプレイされていない");
        if (!(sceneManager.g$currentScene instanceof ScenePlay) || sceneManager.g$currentScene instanceof SceneReplay) await sceneManager.change(ScenePlay);
        await this.startNormal(this.currentGame.playSetting);
    }

    /**
     * 前回の設定と同じでリプレイする
     */
    static async restartReplay() {
        if (!this.isReplaying()) throw new Error("リプレイ中ではない");
        await this.startReplay(this.currentGame.replayData);
    }

    static async startNormal(playSetting: PlaySetting) {
        await this.beforeStart();

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

        await this.playGameBGM(playSetting.playerNumber);

        await this.countDownAndStart();
    }

    static async startReplay(replayData: ReplayData) {
        if (!(sceneManager.g$currentScene instanceof SceneReplay)) await sceneManager.change(SceneReplay);
        await this.beforeStart();

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

        await this.playGameBGM(replayData.playSetting.playerNumber);

        await this.countDownAndStart();

        this.startAutoPlay();
    }

    private static setupReplayInputs(replayData: ReplayData) {
        inputManager.removeVirtualInputs();
        inputManager.resetRegister();
        inputManager.s$maxInputNumber = replayData.playSetting.playerNumber;
        ControllerRegisterer.gamepadConfigs = Array.from(
            { length: replayData.playSetting.playerNumber },
            () => structuredClone(Setting.gamepadConfigPresets[0])
        );

        const playerNumber = replayData.playSetting.playerNumber;
        for (let i = 0; i < playerNumber; i++) {
            const input = new AutoInputObserver(replayData.inputData[i]);
            inputManager.register(input);
        }
    }

    private static startAutoPlay() {
        inputManager.g$registeredInputs.forEach((input) => {
            if (!(input instanceof AutoInputObserver)) throw new Error("inputが自動ではありません");

            input.playReset();
            input.playStart();
        });
    }

    private static async onFinishNormal() {
        await MusicManager.fadeOutBGM(300);
        await sceneManager.change(SceneResult);
        inputManager.removeVirtualInputs();

        Replay.addTempData(this.currentGame!);
        ResultPageHandler.setSaveButton();
        ResultPageHandler.updateDetailedResultPage(this.currentGame!);
    }

    private static async onFinishReplay() {
        await MusicManager.fadeOutBGM(300);
        await sceneManager.change(SceneResult, false);
        sceneManager.g$currentPageManager?.openPage("replayResult");
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

    private static async beforeStart() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        if (this.currentGame) this.currentGame.quit();

        // 背景をリセット
        playBackground.reset();

        MusicManager.stopAllBGM();

        // ページ移動
        pageManager.openPage("play", true);
        pageManager.openPage("startEffect");
    }

    private static playGameBGM(playerNumber: number) {
        return MusicManager.playExclusiveBGM(playerNumber === 1 ? "ならべてトライアングル" : "Top of the Pyramid");
    }
}
