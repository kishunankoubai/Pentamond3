import { gameEvents, GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import * as Setting from "../../Settings";
import { qsAll, removeMousePointerTemporary } from "../../Utils";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { ControllerRegisterer } from "../../BeforePlaying/ControllerRegisterer";

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
        this.executeEvent("gameFinish");
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
            }),

            p.operator.addHandler("put", () => {
                p.playInfo.put += 1;
                p.playInfo.lastTrick = null;
                p.playInfo.chain = 0;
                p.playInfo.score += 10;
            }),

            p.operator.addHandler("unput", () => {
                p.playInfo.put -= 1;
                p.playInfo.score -= 10;
                p.playInfo.unput += 1;
            }),

            p.operator.addHandler("hold", () => {
                p.playInfo.hold += 1;
            }),

            p.operator.addHandler("removeLine", () => {
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
