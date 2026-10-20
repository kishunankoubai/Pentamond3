import { sleep } from "../Utilities/Common";

import { GameMode, GameModeClass } from "../Game/GameMode";
import { GamePlayer } from "../Game/GamePlayer";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import type { ReplayData, ReplayRandomSeeds } from "../Replay/Replay";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { createRandomSeed } from "../Utilities/Random/SeededRandom";
import { PlayStatistics } from "../Storage/PlayStatistics";
import { Achievements } from "../Achievements/Achievements";
import { SimulationClock } from "../Utilities/Loop/SimulationClock";
import { newRecordHighlights } from "./ResultHighlights";
import { MyEventListener } from "../Utilities/Event/MyEventListener";

/**
 * ゲームのセッティングから片付けまでやって捨てられるクラス
 * ending: 結果算定直後。finished: 終了演出の待機後。どちらもこの試合を同期通知する。
 */
export class DisposableGame extends MyEventListener {
    readonly players: GamePlayer[];
    readonly game: GameMode;

    readonly playSetting: PlaySetting;
    readonly replayData?: ReplayData;
    readonly randomSeeds: ReplayRandomSeeds;
    readonly clock = new SimulationClock();
    readonly highlights = { records: [] as string[], achievements: [] as string[] };

    private hasStarted = false;
    private disposed = false;
    constructor(gameModeList: GameModeClass[], inputs: InputObserver[], inputCount: number, { playSetting, replayData }: { playSetting?: PlaySetting; replayData?: ReplayData }) {
        super();
        if (replayData) {
            this.replayData = replayData;
            this.playSetting = replayData.playSetting;
        } else if (playSetting) {
            this.playSetting = playSetting;
        } else {
            throw new Error("引数不足");
        }

        this.randomSeeds = this.replayData?.randomSeeds ?? {
            next: Array.from({ length: inputCount }, () => createRandomSeed()),
            nuisance: Array.from({ length: inputCount }, () => createRandomSeed()),
        };

        //登録されているinputをもとにplayersを作成する
        this.players = DisposableGame.createPlayers(this.playSetting, inputs, inputCount, this.randomSeeds, this.clock);

        // ゲームを作成
        const CurrentMode = gameModeList[this.playSetting.mode - 1];
        if (!CurrentMode) throw new Error("未対応のゲームモードです");
        this.game = new CurrentMode(this.players, this.clock);
        this.game.addHandler("gameFinish", () => this.onGameFinish(), 1);
    }

    /** すでに開始されているか。 */
    get g$hasStarted(): boolean {
        return this.hasStarted;
    }

    /** すでに終了しているか。 */
    get g$hasFinished(): boolean {
        return this.game.g$hasFinished;
    }

    /** プレイ中か。 */
    get g$isPlaying(): boolean {
        return this.game.g$isPlaying;
    }

    quit() {
        this.disposed = true;
        this.removeAllEvent();
        this.game.stop();
        this.game.remove();
    }

    appendPlayersTo(container: HTMLElement) {
        this.players.forEach((player) => {
            container.appendChild(player.g$element);
        });
    }

    isReplay() {
        return !!this.replayData;
    }

    async start() {
        this.game.start();
        this.hasStarted = true;
    }

    setPlaybackSpeed(speed: number) {
        this.clock.setPlaybackSpeed(speed);
        this.players.forEach((player) => player.setPlaybackSpeed(speed));
    }

    private async onGameFinish() {
        if (this.disposed) return;
        const previousStatistics = PlayStatistics.getData();
        const previousAchievements = new Set(Achievements.achievedIds());
        PlayStatistics.recordCompletedGame(this);
        Achievements.recordCompletedGame(this);
        if (!this.isReplay()) {
            this.highlights.records = newRecordHighlights(previousStatistics, PlayStatistics.getData());
            this.highlights.achievements = Achievements.achievedIds().filter((id) => !previousAchievements.has(id));
        }
        this.executeEvent("ending", this);
        if (this.disposed) return;
        if (this.isReplay()) {
            this.onFinishReplay();
        }

        await sleep(1000);
        if (this.disposed) return;
        this.game.remove();
        this.executeEvent("finished", this);
        this.removeAllEvent();
    }

    private onFinishReplay() {
        const data = this.replayData;

        if (!data) throw new Error("この関数はリプレイ時のみ実行されるはず");

        // Timeを上書き
        data.finishPlayers.forEach((index) => {
            const player = this.players![index - 1];
            player.playInfo.playTime = data.finishTime;
            player.label.updateContents({ playTime: (data.finishTime / 1000).toFixed(2) });
        });
    }

    private static createPlayers(playSetting: PlaySetting, inputs: InputObserver[], inputCount: number, randomSeeds: ReplayRandomSeeds, clock: SimulationClock) {
        const players = inputs.map((input, i) =>
            new GamePlayer(input, inputCount, {
                next: randomSeeds.next[i],
                nuisance: randomSeeds.nuisance[i],
            }, clock)
        );

        players.forEach((player, i) => {
            if (inputCount == 1) {
                player.g$element.style.flex = "none";
                player.g$element.style.height = "100%";
                player.g$element.style.width = "";
            } else {
                player.g$element.style.flex = "";
                player.g$element.style.height = "";
                player.g$element.style.width = `0px`;
            }

            player.playInfo.initialMaxGameTime = playSetting.maxGameTime;
            player.playInfo.maxGameTime = playSetting.maxGameTime;
            player.playInfo.gameTime = playSetting.maxGameTime;
            player.playInfo.handy = playSetting.mode === 1 ? (playSetting.handy[i] ?? 1) : 1;
            player.playInfo.targetLines = playSetting.targetLines;

        });

        return players;
    }
}
