import { LoopManager } from "../UtilManagers/LoopManager";
import { MondOperator } from "../BlockOperate/MondOperator";
import { NuisanceMondManager } from "./NuisanceMondManager";
import { Input } from "../Interaction/Input";
import { CanvasManager } from "../CanvasManager";
import { InformationLabelManager } from "./InformationLabelManager";
import { TrickInfo } from "../Trick";
import * as Setting from "../Settings";
import { gameEvents } from "./GameMode";
import { GraphicSetting } from "../GraphicSetting";

class PlayInfo {
    readonly maxGameTime: number = 300;
    /**かりそめの値 */
    playTime = 0;

    line = 0;

    lastTrick: TrickInfo | null = null;
    trickCount = 0;

    chain = 0;
    maxChain = 0;

    score = 0;

    penalty = 0;
    penaltyTask = 0;

    recovery = 0;
    surplus = 0;

    put = 0;
    hold = 0;
    unput = 0;
    remove = 0;

    handy = 1;

    constructor(maxGameTime: number) {
        this.maxGameTime = maxGameTime;
    }

    recover(time: number, elapsedTime: number) {
        this.recovery += time;

        const currentTime = this.getCurrentTime(elapsedTime);

        if (currentTime + time > this.maxGameTime) {
            this.surplus += currentTime + time - this.maxGameTime;
        }
    }

    getCurrentTime(elapsedTime: number) {
        return Math.max(Math.ceil(this.maxGameTime - elapsedTime) - this.penalty + this.recovery - this.surplus, 0);
    }
}

export class GamePlayer {
    readonly playInfo: PlayInfo;

    readonly state = {
        hasFinished: false,
        damaging: false,
    };

    readonly damageInfo = {
        damageTask: 0,
        temporaryDamageTask: 0,
        attackTask: 0,
        lastDamageTime: 0,
        totalDamage: 0,
        totalAttack: 0,
    };

    readonly operator: MondOperator = new MondOperator();
    readonly loop: LoopManager = new LoopManager();
    readonly input: Input;

    readonly nuisanceMondManager: NuisanceMondManager;

    readonly canvas: CanvasManager = new CanvasManager();
    readonly label: InformationLabelManager;
    private readonly playField: HTMLDivElement = document.createElement("div");

    readonly animations = createAnimations(this.playField);
    private runningAnimations: Animation[] = [];

    constructor(input: Input, playerNum: number, maxGameTime: number) {
        this.input = input;
        this.label = new InformationLabelManager(playerNum);
        this.playInfo = new PlayInfo(maxGameTime);

        this.nuisanceMondManager = new NuisanceMondManager(this.operator.blockManager);

        this.setupEvents();

        this.setupPlayField();

        this.loop.s$loopFrequency = 1000 / 60;
    }

    private setupEvents() {
        gameEvents.push(
            this.nuisanceMondManager.addEvent(["finishDamage"], () => this.onFinishDamage()),
            this.nuisanceMondManager.addEvent(["damageBoard"], () => {
                this.playInfo.penalty += 1;
                this.animations.damageBoard.play();
            }),
            this.nuisanceMondManager.addEvent(["progress"], () => {
                this.canvas.readData(this.operator.g$graphicData);
                this.canvas.paintPlayCanvas();
            }),
            this.operator.addEvent(["put"], () => {
                if (GraphicSetting.putShake) {
                    this.animations.put.play();
                }
            })
        );
    }

    private onFinishDamage() {
        this.state.damaging = false;

        this.damageInfo.damageTask = 0;

        this.operator.forgetPrev();

        this.animations.caution.cancel();
        this.animations.warning.cancel();

        this.proceedTemporaryDamageTask();

        if (this.loop.g$isLooping) {
            this.operator.start();
        }

        this.updateCanvas();
    }

    private setupPlayField() {
        this.playField.classList.add("playField");
        this.playField.appendChild(this.canvas.g$playCanvas);
        this.playField.appendChild(this.canvas.g$nextCanvas);
        this.playField.appendChild(this.label.g$element);
        this.canvas.paint();

        Object.values(this.animations).forEach((animation) => {
            animation.cancel();
        });
    }

    get g$element(): HTMLDivElement {
        return this.playField;
    }

    get g$playTimeString() {
        return (this.loop.g$elapsedTime / 1000).toFixed(2);
    }

    /**始まった時または再開した時 */
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

        if (this.input.g$type == "autoKeyboard") {
            this.input.g$manager.start();
        }
    }

    /**時止め */
    stop() {
        this.loop.stop();
        this.operator.stop();
        this.nuisanceMondManager.stop();

        this.runningAnimations = Object.values(this.animations).filter((animation) => animation.playState == "running");
        this.runningAnimations.forEach((animation) => {
            animation.pause();
        });

        if (this.input.g$type == "autoKeyboard") {
            this.input.g$manager.stop();
        }
    }

    /**終了 */
    finish() {
        this.stop();
        this.state.hasFinished = true;
        this.animations.timeWarning.cancel();
    }

    addDamageTask(damageTask: number) {
        if (this.state.hasFinished || damageTask == 0) {
            return;
        }

        // ダメージ猶予中
        if (this.damageInfo.damageTask != 0 && !this.state.damaging) {
            this.damageInfo.damageTask += damageTask;
            return;
        }

        // ダメージ中
        if (this.state.damaging) {
            this.damageInfo.temporaryDamageTask += damageTask;
            return;
        }

        // ダメージ待機中
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

    recover(time: number) {
        const elapsedTime = this.loop.g$elapsedTime / Setting.gameTimeRate;
        this.playInfo.recover(time, elapsedTime);
    }

    getCurrentTime() {
        const elapsedTime = this.loop.g$elapsedTime / Setting.gameTimeRate;
        return this.playInfo.getCurrentTime(elapsedTime);
    }

    updateCanvas() {
        this.canvas.readData(this.operator.g$graphicData);
        this.canvas.paint();
    }
}

function createAnimations(playField: HTMLElement) {
    return {
        put: playField.animate(
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
        removeLineWithTrick: playField.animate(
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
        removeLineWithoutTrick: playField.animate(
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

        caution: playField.animate(
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
        warning: playField.animate(
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
        damageBoard: playField.animate(
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
        timeWarning: playField.animate(
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
        finish: playField.animate(
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
}
