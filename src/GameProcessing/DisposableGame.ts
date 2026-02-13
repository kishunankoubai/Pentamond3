import { sleep } from "../Utils";

import { GameMode } from "../Game/GameMode";
import { GamePlayer } from "../Game/GamePlayer";
import { Input } from "../Interaction/Input";
import { ReplayData } from "../Replay/Replay";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";

/**
 * ゲームのセッティングから片付けまでやって捨てられるクラス
 */
export class DisposableGame {
    readonly players: GamePlayer[];
    readonly game: GameMode;

    readonly playSetting: PlaySetting;
    readonly replayData?: ReplayData;

    private hasStarted = false;
    /**
     * すでに開始されているか
     */
    get g$hasStarted() {
        return this.hasStarted;
    }
    /**
     * すでに終了しているか
     */
    get g$hasFinished() {
        return this.game.g$hasFinished;
    }
    /**
     * プレイ中か
     */
    get g$isPlaying() {
        return this.game.g$isPlaying;
    }

    onFinished = () => {};

    constructor(gameModeList: (typeof GameMode)[], inputs: Input[], inputCount: number, { playSetting, replayData }: { playSetting?: PlaySetting; replayData?: ReplayData }) {
        if (replayData) {
            this.replayData = replayData;
            this.playSetting = replayData.playSetting;
        } else if (playSetting) {
            this.playSetting = playSetting;
        } else {
            throw new Error("引数不足");
        }

        //登録されているinputをもとにplayersを作成する
        this.players = DisposableGame.createPlayers(this.playSetting.maxGameTime, inputs, inputCount, { replayData: this.replayData });

        // ゲームを作成
        const CurrentMode = gameModeList[this.playSetting.mode - 1];
        // @ts-ignore
        this.game = new CurrentMode(this.players);
        this.game.addEvent(["gameFinish"], async () => {
            await this.onGameFinish();
        });
    }

    quit() {
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

    private async onGameFinish() {
        if (this.isReplay()) {
            this.onFinishReplay();
        }

        await sleep(1000);
        this.game.remove();
        this.onFinished();
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

    private static createPlayers(maxGameTime: number, inputs: Input[], inputCount: number, { replayData }: { replayData?: ReplayData }) {
        const players = inputs.map((input) => new GamePlayer(input, inputCount, maxGameTime));

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

            //リプレイ情報の読み込み
            if (replayData) {
                player.operator.s$next = replayData.nextData[i];
                player.nuisanceMondManager.s$spawnCoordinates = replayData.nuisanceBlockData[i];
            }
        });

        return players;
    }
}
