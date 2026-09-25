import { EventManager } from "../../UtilManagers/EventManager";
import { gameEvents, GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import * as Setting from "../../Settings";
import { qsAll, removeMousePointerTemporary } from "../../Utils";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { ControllerRegisterer } from "../../BeforePlaying/ControllerRegisterer";
import { sceneManager } from "../../Utilities/SceneManager";

export class Mode2 extends GameMode {
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
            p.label.updateContents({
                gameTime: "",
                playTime: p.g$playTimeString,
                line: p.playInfo.line + "",
                lastTrick: "",
                chain: p.playInfo.chain + "",
                score: p.playInfo.score + "",
            });
            p.playInfo.playTime = p.loop.g$elapsedTime;
        });
        qsAll(".resultLabel").forEach((resultLabel) => {
            if (this.winners.length < this.players.length) {
                resultLabel.innerHTML = `Player ${this.winners.map((player) => this.players.indexOf(player) + 1).toString()} won! : ${this.winners[0].g$playTimeString}`;
            } else if (1 < this.players.length) {
                resultLabel.innerHTML = `Draw : ${this.winners[0].g$playTimeString}`;
            } else {
                resultLabel.innerHTML = `Time : ${this.winners[0].g$playTimeString}`;
            }
        });
        EventManager.executeListeningEvents("gameFinish", this.eventIds);
    }

    addPlayerBehavior(index: number): void {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

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
                if (p.loop.g$isStopping || this.state.hasFinished) {
                    return;
                }
                this.stop();
                pageManager.openPage("pause");
            } else {
                return;
            }
            removeMousePointerTemporary();
            p.updateCanvas();
        };

        p.label.s$visible = { gameTime: false, playTime: true, line: true, lastTrick: false, chain: true, score: true };
        const updateLabel = () => {
            p.label.updateContents({
                gameTime: "",
                playTime: p.g$playTimeString,
                line: p.playInfo.line + "",
                lastTrick: "",
                chain: p.playInfo.chain + "",
                score: p.playInfo.score + "",
            });
        };
        let lastOperateTime = 0;
        p.canvas.guideBorder = true;
        gameEvents.push(
            input.addEvent(["onKeydown", "onButtondown", "onStickActive"], () => {
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
            }),

            p.operator.addEvent(["put"], () => {
                p.playInfo.put += 1;
                p.playInfo.lastTrick = null;
                p.playInfo.chain = 0;
                p.playInfo.score += 10;
            }),

            p.operator.addEvent(["unput"], () => {
                p.playInfo.put -= 1;
                p.playInfo.score -= 10;
                p.playInfo.unput += 1;
            }),

            p.operator.addEvent(["hold"], () => {
                p.playInfo.hold += 1;
            }),

            p.operator.addEvent(["removeLine"], () => {
                const lastTrick = p.operator.g$lastTrick;
                if (lastTrick) {
                    if (["一列揃え(上)", "一列揃え(下)"].includes(lastTrick.name)) {
                        p.playInfo.line += 1;
                        p.playInfo.score += p.playInfo.chain * 100;
                        p.playInfo.score += (lastTrick.time + lastTrick.attack) * 50;
                        p.playInfo.chain += 1;
                        p.playInfo.maxChain = Math.max(p.playInfo.maxChain, p.playInfo.chain);
                        p.canvas.guideBorderHeight = 15 - p.playInfo.line;
                        p.canvas.paintPlayCanvas();
                        if (GraphicSetting.removeShake) {
                            p.animations.removeLineWithTrick.play();
                        }
                    } else {
                        p.playInfo.chain = 0;
                        if (GraphicSetting.removeShake) {
                            p.animations.removeLineWithoutTrick.play();
                        }
                    }
                } else {
                    p.playInfo.chain = 0;
                    if (GraphicSetting.removeShake) {
                        p.animations.removeLineWithoutTrick.play();
                    }
                }
                p.playInfo.lastTrick = p.operator.g$lastTrick;
                p.playInfo.remove += 1;

                if (p.playInfo.line >= 15) {
                    p.finish();
                    this.proceedPlayerFinish();
                }
            })
        );
    }
}
