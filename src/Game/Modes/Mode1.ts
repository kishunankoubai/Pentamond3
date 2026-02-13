import { EventManager } from "../../UtilManagers/EventManager";
import { gameEvents, GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import { pageManager } from "../../UtilManagers/PageManager";
import * as Setting from "../../Settings";
import { qsAll, removeMousePointerTemporary } from "../../Utils";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { se } from "../../SoundProcessing";
import { ControllerRegisterer } from "../../BeforePlaying/ControllerRegisterer";

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
            if (p.getCurrentTime() == 0) {
                if (p.state.hasFinished) {
                    return;
                }
                p.finish();
                p.label.updateContents({
                    gameTime: p.getCurrentTime() + "",
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
            //プレイしている人がいない場合、最も時間を残している人が全員勝利
        } else if (playingPlayers.length == 0) {
            const max = Math.max(
                ...this.players.map((player) => {
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
                    gameTime: p.getCurrentTime() + "",
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

            EventManager.executeListeningEvents("gameFinish", this.eventIds);
        }
    }

    addPlayerBehavior(index: number): void {
        const p = this.players[index];
        const input = p.input.g$manager;
        const operate = (keyCode: string) => {
            if (["ArrowLeft", ...ControllerRegisterer.gamepadConfigs[index].moveLeft].includes(keyCode)) {
                p.operator.move("left");
            } else if (["ArrowRight", ...ControllerRegisterer.gamepadConfigs[index].moveRight].includes(keyCode)) {
                p.operator.move("right");
            } else if (["ArrowDown", ...ControllerRegisterer.gamepadConfigs[index].moveDown].includes(keyCode)) {
                p.operator.move("down");
            } else if (["ArrowUp", ...ControllerRegisterer.gamepadConfigs[index].put].includes(keyCode)) {
                p.operator.put();
            } else if (["KeyC", ...ControllerRegisterer.gamepadConfigs[index].spinLeft].includes(keyCode)) {
                p.operator.spin("left");
            } else if (["KeyV", ...ControllerRegisterer.gamepadConfigs[index].spinRight].includes(keyCode)) {
                p.operator.spin("right");
            } else if (["KeyB", ...ControllerRegisterer.gamepadConfigs[index].unput].includes(keyCode)) {
                p.operator.unput();
            } else if (["Space", ...ControllerRegisterer.gamepadConfigs[index].hold].includes(keyCode)) {
                p.operator.hold();
            } else if (["Enter", ...ControllerRegisterer.gamepadConfigs[index].removeLine].includes(keyCode)) {
                p.operator.removeLine();
            } else if (["KeyP", ...ControllerRegisterer.gamepadConfigs[index].pause].includes(keyCode)) {
                if (!p.loop.g$isLooping || this.state.hasFinished) {
                    return;
                }
                this.stop();
                pageManager.setPage("pause");
            } else {
                return;
            }
            removeMousePointerTemporary();
            p.updateCanvas();
        };

        p.label.s$visible = { gameTime: true, playTime: false, line: false, lastTrick: true, chain: true, score: true };
        const updateLabel = () => {
            p.label.updateContents({
                gameTime: p.getCurrentTime() + "",
                playTime: "",
                line: "",
                lastTrick: p.playInfo.lastTrick ? p.playInfo.lastTrick.name : "　",
                chain: p.playInfo.chain + "",
                score: p.playInfo.score + "",
            });
        };

        let lastOperateTime = 0;

        gameEvents.push(
            input.addEvent(["onKeydown", "onButtondown", "onStickActive"], () => {
                if (!p.loop.g$isLooping) {
                    return;
                }
                operate(input.g$latestPressingKey);
            }),

            p.loop.addEvent(["loop"], () => {
                const moveKeys = [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowDown",
                    ...ControllerRegisterer.gamepadConfigs[index].moveLeft,
                    ...ControllerRegisterer.gamepadConfigs[index].moveRight,
                    ...ControllerRegisterer.gamepadConfigs[index].moveDown,
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

                if (p.getCurrentTime() <= Setting.warningGameTime) {
                    if (p.animations.timeWarning.playState != "running") {
                        p.animations.timeWarning.play();
                    }
                } else if (p.animations.timeWarning.playState == "running") {
                    p.animations.timeWarning.cancel();
                }
                if (p.getCurrentTime() == 0) {
                    this.proceedPlayerFinish();
                }

                if (p.damageInfo.damageTask && p.loop.g$elapsedTime - p.damageInfo.lastDamageTime >= Setting.damageWaitingTime) {
                    if (p.animations.warning.playState != "running") {
                        p.animations.caution.cancel();
                        p.animations.warning.play();
                    }
                }
            }),

            p.operator.addEvent(["put"], () => {
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
                se[2].play();
            }),

            p.operator.addEvent(["unput"], () => {
                p.playInfo.put -= 1;
                p.playInfo.score -= 10;
                p.playInfo.penalty += Setting.penalty.unput;
                p.playInfo.unput += 1;
            }),

            p.operator.addEvent(["hold"], () => {
                p.playInfo.hold += 1;
            }),

            p.operator.addEvent(["removeLine"], () => {
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

                    p.recover(lastTrick.time);

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
