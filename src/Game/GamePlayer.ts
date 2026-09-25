import { LoopManager } from "../Utilities/Loop/LoopManager";
import { MondOperator } from "../BlockOperate/MondOperator";
import { NuisanceMondManager } from "./NuisanceMondManager";
import { AutoInputObserver } from "../Utilities/Interaction/AutoInputObserver";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import { CanvasManager } from "../CanvasManager";
import { InformationLabelManager } from "./InformationLabelManager";
import { TrickInfo } from "../Trick";
import * as Setting from "../Settings";
import { gameEvents } from "./GameMode";
import { GraphicSetting } from "../GraphicSetting";

export class GamePlayer {
    operator: MondOperator;
    loop: LoopManager = new LoopManager();
    nuisanceMondManager: NuisanceMondManager;
    canvas: CanvasManager = new CanvasManager();
    label: InformationLabelManager;
    input: InputObserver;
    playField: HTMLDivElement = document.createElement("div");
    playInfo = {
        maxGameTime: 300,
        gameTime: 300,
        playTime: 0,
        line: 0,
        lastTrick: null as TrickInfo | null,
        trickCount: 0,
        chain: 0,
        maxChain: 0,
        score: 0,
        penalty: 0,
        penaltyTask: 0,
        recovery: 0,
        surplus: 0,
        put: 0,
        hold: 0,
        unput: 0,
        remove: 0,
        handy: 1,
    };
    state = {
        hasFinished: false,
        damaging: false,
    };
    damageInfo = {
        damageTask: 0,
        temporaryDamageTask: 0,
        attackTask: 0,
        lastDamageTime: 0,
        totalDamage: 0,
        totalAttack: 0,
    };
    animations = {
        put: this.playField.animate(
            [
                {
                    transform: "translate(0, 0.3vh)",
                },
                {
                    transform: "",
                },
            ],
            {
                duration: 100,
                direction: "normal",
                iterations: 1,
                easing: "ease-out",
            }
        ),
        removeLineWithTrick: this.playField.animate(
            [
                {
                    rotate: "0deg",
                },
                {
                    rotate: "-0.5deg",
                },
                {
                    rotate: "0.5deg",
                    scale: 1.02,
                },
                {
                    rotate: "0deg",
                },
            ],
            {
                duration: 100,
                direction: "normal",
                iterations: 1,
            }
        ),
        removeLineWithoutTrick: this.playField.animate(
            [
                {
                    rotate: "0deg",
                },
                {
                    rotate: "-0.5deg",
                },
                {
                    rotate: "0.5deg",
                },
                {
                    rotate: "0deg",
                },
            ],
            {
                duration: 70,
                direction: "normal",
                iterations: 1,
            }
        ),

        caution: this.playField.animate(
            [
                {
                    backgroundColor: "",
                },
                {
                    backgroundColor: "#eeee99",
                },
                {
                    backgroundColor: "#eeee99",
                },
                {
                    backgroundColor: "",
                },
            ],
            {
                duration: 1000,
                direction: "normal",
                iterations: Infinity,
            }
        ),
        warning: this.playField.animate(
            [
                {
                    backgroundColor: "",
                },
                {
                    backgroundColor: "#ee9999",
                },
                {
                    backgroundColor: "#ee9999",
                },
                {
                    backgroundColor: "",
                },
            ],
            {
                duration: 1000,
                direction: "normal",
                iterations: Infinity,
            }
        ),
        damageBoard: this.playField.animate(
            [
                {
                    transform: "translate(0, 1.4vh)",
                },
                {
                    transform: "",
                },
            ],
            {
                duration: 10,
                direction: "normal",
                iterations: 1,
            }
        ),
        timeWarning: this.playField.animate(
            [
                {
                    transform: "",
                    rotate: "0deg",
                },
                {
                    transform: "translate(-0.08vh, 0)",
                    rotate: "-0.2deg",
                },
                {
                    transform: "translate(0.08vh, 0)",
                    rotate: "0.2deg",
                },
                {
                    rotate: "0deg",
                },
            ],
            {
                duration: 200,
                direction: "normal",
                iterations: Infinity,
            }
        ),
        finish: this.playField.animate(
            [
                {
                    opacity: 1,
                    rotate: "0deg",
                    scale: 1,
                },
                {
                    opacity: 0,
                    rotate: "720deg",
                    scale: 0,
                },
            ],
            {
                duration: 1000,
                direction: "normal",
                fill: "forwards",
                iterations: 1,
            }
        ),
    };
    runningAnimations: Animation[] = [];

    constructor(input: InputObserver, playerCount: number, seeds: { next: number; nuisance: number }) {
        this.operator = new MondOperator(seeds.next);
        this.label = new InformationLabelManager(playerCount);
        this.nuisanceMondManager = new NuisanceMondManager(this.operator.blockManager, seeds.nuisance);
        this.loop.s$onTime = false;
        gameEvents.push(
            this.nuisanceMondManager.addHandler("finishDamage", () => {
                this.state.damaging = false;
                this.damageInfo.damageTask = 0;
                this.operator.forgetPrev();
                this.animations.caution.cancel();
                this.animations.warning.cancel();
                this.proceedTemporaryDamageTask();
                if (!this.loop.g$isStopping) {
                    this.operator.start();
                }
                this.updateCanvas();
            }),
            this.nuisanceMondManager.addHandler("damageBoard", () => {
                this.playInfo.penalty += 1;
                this.animations.damageBoard.play();
            }),
            this.nuisanceMondManager.addHandler("progress", () => {
                this.canvas.readData(this.operator.g$graphicData);
                this.canvas.paintPlayCanvas();
            }),
            this.operator.addHandler("put", () => {
                if (GraphicSetting.putShake) {
                    this.animations.put.play();
                }
            })
        );
        this.input = input;
        this.playField.classList.add("playField");
        this.playField.appendChild(this.canvas.g$playCanvas);
        this.playField.appendChild(this.canvas.g$nextCanvas);
        this.playField.appendChild(this.label.g$element);
        this.canvas.paint();
        Object.values(this.animations).forEach((animation) => {
            animation.cancel();
        });
        this.loop.s$loopFrequency = 1000 / 60;
    }

    get g$element(): HTMLDivElement {
        return this.playField;
    }

    get g$playTimeString() {
        return (this.loop.g$elapsedTime / 1000).toFixed(2);
    }

    start() {
        if (this.state.hasFinished) {
            return;
        }
        this.loop.start();
        if (!this.state.damaging) {
            this.operator.start();
        }
        this.nuisanceMondManager.start();
        this.updateCanvas();
        this.runningAnimations.forEach((animation) => {
            animation.play();
        });
        if (this.input instanceof AutoInputObserver) this.input.start();
    }

    stop() {
        this.loop.stop();
        this.operator.stop();
        this.nuisanceMondManager.stop();
        this.runningAnimations = Object.values(this.animations).filter((animation) => {
            animation.playState == "running";
        });
        this.runningAnimations.forEach((animation) => {
            animation.pause();
        });
        if (this.input instanceof AutoInputObserver) this.input.stop();
    }

    finish() {
        this.stop();
        this.updateGameTime();
        this.state.hasFinished = true;
        this.animations.timeWarning.cancel();
    }

    addDamageTask(damageTask: number) {
        if (this.state.hasFinished || damageTask == 0) {
            return;
        }
        if (this.damageInfo.damageTask != 0 && !this.state.damaging) {
            this.damageInfo.damageTask += damageTask;
            return;
        }
        if (this.state.damaging) {
            this.damageInfo.temporaryDamageTask += damageTask;
            return;
        }
        this.damageInfo.lastDamageTime = this.loop.g$elapsedTime;
        this.damageInfo.damageTask += damageTask;
        this.animations.caution.play();
    }

    private proceedTemporaryDamageTask() {
        if (this.state.damaging || this.state.hasFinished) {
            return;
        }
        if (this.damageInfo.temporaryDamageTask > 0) {
            this.damageInfo.damageTask += this.damageInfo.temporaryDamageTask;
            this.damageInfo.temporaryDamageTask = 0;
            this.damageInfo.lastDamageTime = this.loop.g$elapsedTime;
            this.animations.caution.play();
        }
    }

    damage() {
        if (this.state.damaging || this.damageInfo.damageTask == 0 || this.state.hasFinished) {
            return;
        }
        this.state.damaging = true;
        this.operator.stop();
        this.nuisanceMondManager.damage(this.damageInfo.damageTask);
        this.nuisanceMondManager.start();
    }

    updateGameTime() {
        if (this.state.hasFinished) {
            return;
        }
        this.playInfo.gameTime = Math.max(
            Math.ceil(this.playInfo.maxGameTime - this.loop.g$elapsedTime / Setting.gameTimeRate) - this.playInfo.penalty + this.playInfo.recovery - this.playInfo.surplus,
            0
        );
        if (this.playInfo.gameTime > this.playInfo.maxGameTime) {
            this.playInfo.surplus += this.playInfo.gameTime - this.playInfo.maxGameTime;
            this.playInfo.gameTime = this.playInfo.maxGameTime;
        }
    }

    updateCanvas() {
        this.canvas.readData(this.operator.g$graphicData);
        this.canvas.paint();
    }
}
