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
import { globalValues } from "../Global";

//ゲーム開始
export class GameProcessing {
    private static readonly ModeClassList = [Mode1, Mode2];
    static readonly replaySpeeds = [0.25, 0.5, 0.75, 1, 1.5, 2, 4] as const;
    private static replaySpeedIndex = 3;
    private static replayControlsEnabled = false;

    static currentGame: DisposableGame | null = null;

    static get g$replaySpeed(): number {
        return this.replaySpeeds[this.replaySpeedIndex];
    }

    static get g$replayControlsEnabled(): boolean {
        return this.replayControlsEnabled;
    }

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
        this.resetReplayPlaybackState();
        inputManager.removeVirtualInputs();
    }

    static changeReplaySpeed(direction: -1 | 1): void {
        if (!this.canOperateReplay()) return;
        const nextIndex = Math.max(0, Math.min(this.replaySpeeds.length - 1, this.replaySpeedIndex + direction));
        if (nextIndex === this.replaySpeedIndex) return;
        this.replaySpeedIndex = nextIndex;
        this.currentGame.setPlaybackSpeed(this.g$replaySpeed);
        this.updateReplayControlDisplay();
    }

    static toggleReplayPlayback(): void {
        if (!this.canOperateReplay()) return;
        if (this.currentGame.g$isPlaying) this.currentGame.game.stop();
        else this.currentGame.game.start();
        this.currentGame.setPlaybackSpeed(this.g$replaySpeed);
        this.updateReplayControlDisplay();
    }

    static pauseReplay(): void {
        if (!this.isReplaying() || this.currentGame.g$hasFinished) return;
        this.currentGame.game.stop();
        this.updateReplayControlDisplay();
    }

    static resumeReplay(): void {
        if (!this.canOperateReplay()) return;
        this.currentGame.game.start();
        this.currentGame.setPlaybackSpeed(this.g$replaySpeed);
        this.updateReplayControlDisplay();
    }

    static isReplaying(): this is GameProcessing & { currentGame: DisposableGame & { replayData: ReplayData } } {
        return !!this.currentGame?.isReplay();
    }

    /**
     * 前回の設定と同じでプレイする
     */
    static async restartNormal() {
        if (!this.currentGame) throw new Error("一度もプレイされていない");
        const playSetting = this.currentGame.playSetting;
        if (!(sceneManager.g$currentScene instanceof ScenePlay) || sceneManager.g$currentScene instanceof SceneReplay) await sceneManager.change(ScenePlay, false);
        await this.startNormal(playSetting);
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
        if (!(sceneManager.g$currentScene instanceof SceneReplay)) await sceneManager.change(SceneReplay, false);
        this.resetReplayPlaybackState();
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
        this.currentGame.onEnding = () => this.lockReplayControls();

        this.currentGame.appendPlayersTo(qs("#play"));

        await this.playGameBGM(replayData.playSetting.playerNumber);

        await this.countDownAndStart(() => this.prepareAutoPlay());
        this.replayControlsEnabled = true;
        this.updateReplayControlDisplay();
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

    private static prepareAutoPlay() {
        inputManager.g$registeredInputs.forEach((input) => {
            if (!(input instanceof AutoInputObserver)) throw new Error("inputが自動ではありません");

            input.playReset();
        });
    }

    private static async onFinishNormal() {
        await MusicManager.fadeOutBGM(300);
        await sceneManager.change(SceneResult);
        inputManager.removeVirtualInputs();

        ResultPageHandler.updateResultLabels(this.currentGame!.game.g$resultText);
        Replay.addTempData(this.currentGame!);
        ResultPageHandler.setSaveButton();
        ResultPageHandler.updateDetailedResultPage(this.currentGame!);
    }

    private static async onFinishReplay() {
        this.lockReplayControls();
        await MusicManager.fadeOutBGM(300);
        await sceneManager.change(SceneResult, false);
        sceneManager.g$currentPageManager?.openPage("replayResult");
        inputManager.removeVirtualInputs();

        ResultPageHandler.updateResultLabels(this.currentGame!.game.g$resultText);
        ResultPageHandler.OverWriteTime(this.currentGame!.replayData!.finishTime);
        ResultPageHandler.updateDetailedResultPage(this.currentGame!);
    }

    private static async countDownAndStart(beforeGameStart?: () => void) {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;
        //開始演出
        await countDown(["", "3", "2", "1", "START!"]);

        beforeGameStart?.();
        this.currentGame!.start();

        await pageManager.backPage(1);
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
        return MusicManager.playExclusiveBGM(playerNumber === 1 ? globalValues.soloBGM : "Top of the Pyramid");
    }

    private static canOperateReplay(): this is GameProcessing & { currentGame: DisposableGame & { replayData: ReplayData } } {
        return this.replayControlsEnabled && this.isReplaying() && !this.currentGame.g$hasFinished;
    }

    private static lockReplayControls(): void {
        this.replayControlsEnabled = false;
        this.replaySpeedIndex = 3;
        this.currentGame?.setPlaybackSpeed(1);
        this.updateReplayControlDisplay();
    }

    private static resetReplayPlaybackState(): void {
        this.replayControlsEnabled = false;
        this.replaySpeedIndex = 3;
        this.updateReplayControlDisplay();
    }

    private static updateReplayControlDisplay(): void {
        const status = document.getElementById("replayPlaybackStatus");
        const speed = document.getElementById("replayPlaybackSpeed");
        if (status) status.textContent = this.currentGame?.g$isPlaying && this.replayControlsEnabled ? "再生中" : "停止中";
        if (speed) speed.textContent = `×${this.g$replaySpeed}`;

        const controls = document.getElementById("replayControls");
        controls?.classList.toggle("disabled", !this.replayControlsEnabled);
    }
}
