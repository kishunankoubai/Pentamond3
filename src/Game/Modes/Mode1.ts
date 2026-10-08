import { bindPlayerControls } from "../PlayerControls";
import { GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import * as Setting from "../../Settings";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { MusicManager } from "../../Utilities/Music/MusicManager";
import { emptyRemovalPenalty, survivalTrickReward } from "../SurvivalRules";
import { SimulationClock } from "../../Utilities/Loop/SimulationClock";

export class Mode1 extends GameMode {
    constructor(players: GamePlayer[], clock: SimulationClock) {
        super(players, clock);
        players.forEach((_, i) => {
            this.addPlayerBehavior(i);
        });
    }

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

        //プレイヤーの生死状態を更新する
        this.players.forEach((p) => {
            p.updateGameTime();
            if (p.playInfo.gameTime == 0) {
                if (p.state.hasFinished) {
                    return;
                }
                p.finish();
                p.label.updateContents({
                    gameTime: p.playInfo.gameTime + "",
                    playTime: "",
                    line: "",
                    lastTrick: p.playInfo.lastTrick ? p.playInfo.lastTrick.name : "　",
                    chain: p.playInfo.chain + "",
                    score: p.playInfo.score + "",
                });
                if (this.players.length != 1) {
                    p.animations.finish.play();
                }
            }
        });

        const playingPlayers = this.players.filter((player) => !player.state.hasFinished);
        //一人プレイでなく、プレイしている人が一人なら勝利
        if (playingPlayers.length == 1 && this.players.length >= 1) {
            this.winners = [playingPlayers[0]];
            playingPlayers[0].updateGameTime();
            //プレイしている人がいない場合、最も時間を残している人が全員勝利
        } else if (playingPlayers.length == 0) {
            const max = Math.max(
                ...this.players.map((player) => {
                    player.updateGameTime();
                    return player.loop.g$elapsedTime;
                })
            );
            this.winners = this.players.filter((player) => player.loop.g$elapsedTime == max);
        }
        //勝敗が決しているなら終了
        if (this.winners.length > 0) {
            this.state.hasFinished = true;
            this.stop();
            this.players.forEach((p) => {
                p.label.updateContents({
                    gameTime: p.playInfo.gameTime + "",
                    playTime: "",
                    line: "",
                    lastTrick: p.playInfo.lastTrick ? p.playInfo.lastTrick.name : "　",
                    chain: p.playInfo.chain + "",
                    score: p.playInfo.score + "",
                });
                p.playInfo.playTime = p.loop.g$elapsedTime;
            });
            if (this.winners.length < this.players.length) {
                this.resultText = `Player ${this.winners.map((player) => this.players.indexOf(player) + 1).toString()} won!`;
            } else if (1 < this.players.length) {
                this.resultText = "Draw";
            } else {
                this.resultText = `Score : ${this.winners[0].playInfo.score}`;
            }

            this.executeEvent("gameFinish");
        }
    }

    addPlayerBehavior(index: number): void {
        const p = this.players[index];
        bindPlayerControls(p, index, this.events);

        p.label.s$visible = { gameTime: true, playTime: false, line: false, lastTrick: true, chain: true, score: true };
        const updateLabel = () => {
            p.label.updateContents({
                gameTime: p.playInfo.gameTime + "",
                playTime: "",
                line: "",
                lastTrick: p.playInfo.lastTrick ? p.playInfo.lastTrick.name : "　",
                chain: p.playInfo.chain + "",
                score: p.playInfo.score + "",
            });
        };


        this.events.add(
            p.loop.addHandler("loop", () => {
                p.playInfo.playTime = p.loop.g$elapsedTime;
                updateLabel();
                p.updateGameTime();

                if (p.playInfo.gameTime <= Setting.warningGameTime) {
                    if (p.animations.timeWarning.playState != "running") {
                        p.animations.timeWarning.play();
                    }
                } else if (p.animations.timeWarning.playState == "running") {
                    p.animations.timeWarning.cancel();
                }
                if (p.playInfo.gameTime == 0) {
                    this.proceedPlayerFinish();
                }

                if (p.damageInfo.damageTask && p.loop.g$elapsedTime - p.damageInfo.lastDamageTime >= Setting.damageWaitingTime) {
                    if (p.animations.warning.playState != "running") {
                        p.animations.caution.cancel();
                        p.animations.warning.play();
                    }
                }
            }),

            p.operator.addHandler("put", () => {
                p.playInfo.put += 1;
                p.playInfo.lastTrick = null;
                p.playInfo.chain = 0;
                p.playInfo.score += 10;

                p.playInfo.penaltyTask = Math.max(p.playInfo.penaltyTask - 1, 0);
                if (p.damageInfo.damageTask) {
                    if (p.damageInfo.damageTask > p.damageInfo.attackTask) {
                        console.log(`Player ${index + 1} damage has offset : ${p.damageInfo.attackTask}`);
                        p.damageInfo.damageTask -= p.damageInfo.attackTask;
                        console.log(`Rest damage is ${p.damageInfo.damageTask}`);
                        p.damageInfo.attackTask = 0;
                    } else {
                        console.log(`Player ${index + 1} attack has offset : ${p.damageInfo.damageTask}`);
                        p.damageInfo.attackTask -= p.damageInfo.damageTask;
                        if (p.damageInfo.damageTask) {
                            console.log(`Rest attack is ${p.damageInfo.attackTask}`);
                        } else {
                            console.log(`Damage and attack have just offset`);
                        }
                        p.damageInfo.damageTask = 0;
                        p.animations.caution.cancel();
                        p.animations.warning.cancel();
                    }
                }
                if (p.damageInfo.damageTask && p.loop.g$elapsedTime - p.damageInfo.lastDamageTime >= Setting.damageWaitingTime) {
                    console.log(`Player ${index + 1} has damaged: ${p.damageInfo.damageTask}`);
                    p.damage();
                    p.damageInfo.totalDamage += p.damageInfo.damageTask;
                }
                if (p.damageInfo.attackTask) {
                    p.damageInfo.maxAttack = Math.max(p.damageInfo.maxAttack, p.damageInfo.attackTask);
                    console.log(`Player ${index + 1} has attacked: ${p.damageInfo.attackTask}`);
                    this.players.forEach((player, i) => {
                        if (i != index) {
                            player.addDamageTask(p.damageInfo.attackTask);
                        }
                    });
                    p.damageInfo.totalAttack += p.damageInfo.attackTask;
                    p.damageInfo.attackTask = 0;
                }
            }),

            p.operator.addHandler("unput", () => {
                p.playInfo.put -= 1;
                p.playInfo.score -= 10;
                p.playInfo.penalty += Setting.penalty.unput;
                p.playInfo.unput += 1;
            }),

            p.operator.addHandler("hold", () => {
                p.playInfo.hold += 1;
            }),

            p.operator.addHandler("removeLine", () => {
                const lastTrick = p.operator.g$lastTrick;
                const removeSoundIndex = lastTrick ? Math.min(6, p.playInfo.chain) : 0;
                if (lastTrick) {
                    p.playInfo.penaltyTask = 0;
                    if (["一列揃え(上)", "一列揃え(下)"].includes(lastTrick.name)) {
                        p.playInfo.line += 1;
                    }
                    const reward = survivalTrickReward(lastTrick, p.playInfo.chain, p.playInfo.handy);
                    p.playInfo.score += reward.score;
                    p.damageInfo.attackTask += reward.attack;
                    p.playInfo.recovery += reward.recovery;
                    p.playInfo.chain += 1;
                    p.playInfo.maxChain = Math.max(p.playInfo.maxChain, p.playInfo.chain);
                    p.playInfo.trickCount += 1;
                    if (GraphicSetting.removeShake) {
                        p.animations.removeLineWithTrick.play();
                    }
                } else {
                    const penalty = emptyRemovalPenalty(p.playInfo.penaltyTask);
                    p.playInfo.penalty += penalty.charge;
                    p.playInfo.penaltyTask = penalty.nextTask;
                    p.playInfo.chain = 0;
                    if (GraphicSetting.removeShake) {
                        p.animations.removeLineWithoutTrick.play();
                    }
                }
                p.playInfo.lastTrick = p.operator.g$lastTrick;
                p.playInfo.remove += 1;
                if (lastTrick) MusicManager.get(`消去音${removeSoundIndex}`)?.play();
            })
        );
    }
}
