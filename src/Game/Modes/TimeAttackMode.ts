import { bindPlayerControls } from "../PlayerControls";
import { GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import { playBackground } from "../../Rendering/PlayBackground";
import { GraphicSetting } from "../../UI/GraphicSetting";
import { MusicManager } from "../../Utilities/Music/MusicManager";
import { SimulationClock } from "../../Utilities/Loop/SimulationClock";
import { TrickInfo } from "../Tricks";
import { isLineTrick } from "../BoardTricks";

/**
 * 時間計測・操作・消去の演出・先着勝利などの機能
 * 各モードのルールは派生クラスで定義する。
 * */
export abstract class TimeAttackMode extends GameMode {
    constructor(players: GamePlayer[], clock: SimulationClock) {
        super(players, clock);
    }

    /** 派生クラスの初期化を終えてから呼び出す */
    protected initializePlayers(): void {
        this.players.forEach((player, index) => {
            this.configurePlayer(player);
            this.addPlayerBehavior(index);
        });
    }

    protected abstract configurePlayer(player: GamePlayer): void;
    /** このモードで対象外の役はnullを返す */
    protected abstract removalScore(trick: TrickInfo, chain: number): number | null;
    protected abstract updateGoal(player: GamePlayer): void;

    start(): void {
        this.players.forEach((player) => {
            player.start();
        });
        this.clock.start();
        if (GraphicSetting.playBackground) {
            playBackground.start();
        }
    }
    stop(): void {
        this.clock.stop();
        this.players.forEach((player) => {
            player.stop();
        });
        if (GraphicSetting.playBackground) {
            playBackground.stop();
        }
    }
    proceedPlayerFinish(): void {
        if (this.state.hasFinished) {
            return;
        }
        this.winners = this.players.filter((player) => player.state.hasFinished);
        this.state.hasFinished = true;
        this.stop();
        if (this.players.length != 1) {
            this.players
                .filter((p) => !p.state.hasFinished)
                .forEach((p) => {
                    p.animations.finish.play();
                });
        }

        this.players.forEach((p) => {
            this.updateLabel(p);
            p.playInfo.playTime = p.loop.g$elapsedTime;
        });
        if (this.winners.length < this.players.length) {
            this.resultText = `Player ${this.winners.map((player) => this.players.indexOf(player) + 1).toString()} won! : ${this.winners[0].g$playTimeString}`;
        } else if (1 < this.players.length) {
            this.resultText = `Draw : ${this.winners[0].g$playTimeString}`;
        } else {
            this.resultText = `Time : ${this.winners[0].g$playTimeString}`;
        }
        this.executeEvent("gameFinish");
    }

    addPlayerBehavior(index: number): void {
        const p = this.players[index];
        bindPlayerControls(p, index, this.events);

        this.events.add(
            p.loop.addHandler("loop", () => {
                p.playInfo.playTime = p.loop.g$elapsedTime;
                this.updateLabel(p);
            }),

            p.operator.addHandler("put", () => {
                p.playInfo.put += 1;
                p.playInfo.lastTrick = null;
                p.playInfo.chain = 0;
                p.playInfo.score += 10;
                this.updateGoal(p);
            }),

            p.operator.addHandler("unput", () => {
                p.playInfo.put -= 1;
                p.playInfo.unput += 1;
                this.updateGoal(p);
            }),

            p.operator.addHandler("hold", () => {
                p.playInfo.hold += 1;
            }),

            p.operator.addHandler("removeLine", () => {
                const lastTrick = p.operator.g$lastTrick;
                const score = lastTrick ? this.removalScore(lastTrick, p.playInfo.chain) : null;
                const removeSoundIndex = score !== null ? Math.min(6, p.playInfo.chain) : 0;
                if (lastTrick) {
                    p.recordTrick(lastTrick);
                    p.playInfo.trickCount += 1;
                    p.feedback.flashRow(removeSoundIndex);
                }
                if (score !== null) {
                    if (isLineTrick(lastTrick)) p.playInfo.line += 1;
                    p.playInfo.score += score;
                    p.playInfo.chain += 1;
                    p.playInfo.maxChain = Math.max(p.playInfo.maxChain, p.playInfo.chain);
                    p.feedback.showRewards(score);
                    if (GraphicSetting.removeShake) p.animations.removeLineWithTrick.play();
                } else {
                    p.playInfo.chain = 0;
                    if (GraphicSetting.removeShake) p.animations.removeLineWithoutTrick.play();
                }
                p.playInfo.lastTrick = p.operator.g$lastTrick;
                p.playInfo.remove += 1;
                if (lastTrick) MusicManager.get(`消去音${removeSoundIndex}`)?.play();

                this.updateGoal(p);
            })
        );
    }

    protected setGoalState(player: GamePlayer, reached: boolean, ready: boolean): void {
        player.g$element.classList.toggle("timeAttackGoalReady", ready && !reached);
        if (reached) {
            player.finish();
            this.proceedPlayerFinish();
        }
    }

    private updateLabel(player: GamePlayer): void {
        player.label.updateContents({
            gameTime: "",
            playTime: player.g$playTimeString,
            line: String(player.playInfo.line),
            lastTrick: player.playInfo.lastTrick?.name ?? "　",
            chain: String(player.playInfo.chain),
            score: String(player.playInfo.score),
        });
    }
}
