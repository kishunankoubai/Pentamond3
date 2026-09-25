import { gameEvents, GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import * as Setting from "../../Settings";
import { qsAll, removeMousePointerTemporary } from "../../Utils";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { ControllerRegisterer } from "../../BeforePlaying/ControllerRegisterer";
import { MusicManager } from "../../Utilities/Music/MusicManager";

export class Mode1 extends GameMode {
    constructor(players: GamePlayer[]) {
        super(players);
        players.forEach((_, i) => {
            this.addPlayerBehavior(i);
        });
    }

    start(): void {
        this.players.forEach((player) => {
            player.start();
        });
        if (GraphicSetting.playBackground) {
            playBackground.start();
        }
    }
    stop(): void {
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
            qsAll(".resultLabel").forEach((resultLabel) => {
                if (this.winners.length < this.players.length) {
                    resultLabel.innerHTML = `Player ${this.winners.map((player) => this.players.indexOf(player) + 1).toString()} won!`;
                } else if (1 < this.players.length) {
                    resultLabel.innerHTML = `Draw`;
                } else {
                    resultLabel.innerHTML = `Score : ${this.winners[0].playInfo.score}`;
                }
            });

            this.executeEvent("gameFinish");
        }
    }

    addPlayerBehavior(index: number): void {
        const p = this.players[index];
        const input = p.input;
        const gamepadConfig = ControllerRegisterer.gamepadConfigs[index] ?? Setting.gamepadConfigPresets[0];
        const operate = (keyCode: string) => {
            if (["ArrowLeft", ...gamepadConfig.moveLeft].includes(keyCode)) {
                p.operator.move("left");
            } else if (["ArrowRight", ...gamepadConfig.moveRight].includes(keyCode)) {
                p.operator.move("right");
            } else if (["ArrowDown", ...gamepadConfig.moveDown].includes(keyCode)) {
                p.operator.move("down");
            } else if (["ArrowUp", ...gamepadConfig.put].includes(keyCode)) {
                p.operator.put();
            } else if (["KeyC", ...gamepadConfig.spinLeft].includes(keyCode)) {
                p.operator.spin("left");
            } else if (["KeyV", ...gamepadConfig.spinRight].includes(keyCode)) {
                p.operator.spin("right");
            } else if (["KeyB", ...gamepadConfig.unput].includes(keyCode)) {
                p.operator.unput();
            } else if (["Space", ...gamepadConfig.hold].includes(keyCode)) {
                p.operator.hold();
            } else if (["Enter", ...gamepadConfig.removeLine].includes(keyCode)) {
                p.operator.removeLine();
            } else {
                return;
            }
            removeMousePointerTemporary();
            p.updateCanvas();
        };

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

        let lastOperateTime = 0;

        gameEvents.push(
            input.addHandler("inputValid", () => {
                if (p.loop.g$isStopping) {
                    return;
                }
                operate(input.g$latestPressingKey);
            }),

            p.loop.addHandler(["loop"], () => {
                const moveKeys = [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowDown",
                    ...gamepadConfig.moveLeft,
                    ...gamepadConfig.moveRight,
                    ...gamepadConfig.moveDown,
                ];
                const latestKey = input.getLatestPressingKey(moveKeys);
                const pressTime = Date.now() - input.getPressTime(latestKey);
                if (pressTime >= Setting.input.delayTime && latestKey != "") {
                    if (pressTime - lastOperateTime >= Setting.input.repeatTime) {
                        operate(latestKey);
                        lastOperateTime = pressTime;
                    }
                } else {
                    lastOperateTime = 0;
                }

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
                    console.log(`Player ${index + 1} has attacked: ${p.damageInfo.attackTask}`);
                    this.players.forEach((player, i) => {
                        if (i != index) {
                            player.addDamageTask(p.damageInfo.attackTask);
                        }
                    });
                    p.damageInfo.totalAttack += p.damageInfo.attackTask;
                    p.damageInfo.attackTask = 0;
                }
                MusicManager.get("モンド設置音")?.play();
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
                if (lastTrick) {
                    p.playInfo.penaltyTask = 0;
                    if (["一列揃え(上)", "一列揃え(下)"].includes(lastTrick.name)) {
                        p.playInfo.line += 1;
                    }
                    p.playInfo.score += p.playInfo.chain * 100;
                    p.playInfo.score += (lastTrick.time + lastTrick.attack) * 50;
                    p.damageInfo.attackTask += lastTrick.attack + Math.ceil(p.playInfo.chain / 5);
                    p.playInfo.maxChain = Math.max(p.playInfo.maxChain, p.playInfo.chain);
                    p.playInfo.recovery += lastTrick.time;
                    p.playInfo.chain += 1;
                    p.playInfo.trickCount += 1;
                    if (GraphicSetting.removeShake) {
                        p.animations.removeLineWithTrick.play();
                    }
                } else {
                    p.playInfo.penalty += p.playInfo.penaltyTask;
                    p.playInfo.penaltyTask = Setting.penalty.removeLine;
                    p.playInfo.chain = 0;
                    if (GraphicSetting.removeShake) {
                        p.animations.removeLineWithoutTrick.play();
                    }
                }
                p.playInfo.lastTrick = p.operator.g$lastTrick;
                p.playInfo.remove += 1;
            })
        );
    }
}
