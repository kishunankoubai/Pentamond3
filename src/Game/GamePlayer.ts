import { SimulationClock } from "../Utilities/Loop/SimulationClock";
import { SimulationLoop } from "../Utilities/Loop/SimulationLoop";
import { MondOperator } from "../BlockOperate/MondOperator";
import { NuisanceMondManager } from "./NuisanceMondManager";
import { AutoInputObserver } from "../Utilities/Interaction/AutoInputObserver";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import { CanvasManager } from "../CanvasManager";
import { InformationLabelManager } from "./InformationLabelManager";
import { TrickInfo } from "../Trick";
import * as Setting from "../Settings";
import { EventScope } from "../Utilities/EventScope";
import { GraphicSetting } from "../GraphicSetting";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { achievementTrickIndex, achievementTricks } from "../Achievements/Definitions";
import { PlayFeedback } from "./PlayFeedback";

export class GamePlayer {
    readonly trickCounts = Array<number>(achievementTricks.length).fill(0);

    recordTrick(trick: TrickInfo): void {
        const index = achievementTrickIndex(trick.name);
        if (index >= 0) this.trickCounts[index] += 1;
    }

    operator: MondOperator;
    readonly loop: SimulationLoop;
    nuisanceMondManager: NuisanceMondManager;
    canvas: CanvasManager = new CanvasManager();
    label: InformationLabelManager;
    readonly feedback: PlayFeedback;
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
        targetLines: 15,
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
        maxAttack: 0,
    };
    animations = {
        put: this.playField.animate(
            [
                {
                    transform: "translate(0, 0.3cqh)",
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
                    transform: "translate(0, 1.4cqh)",
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
                    transform: "translate(-0.08cqh, 0)",
                    rotate: "-0.2deg",
                },
                {
                    transform: "translate(0.08cqh, 0)",
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
                    scale: 0.98,
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
    private readonly events = new EventScope();
    private damagePenalty = 0;

    constructor(input: InputObserver, playerCount: number, seeds: { next: number; nuisance: number }, readonly clock: SimulationClock) {
        this.loop = new SimulationLoop(clock);
        this.operator = new MondOperator(seeds.next);
        this.label = new InformationLabelManager(playerCount);
        this.feedback = new PlayFeedback(clock, playerCount);
        this.nuisanceMondManager = new NuisanceMondManager(this.operator.blockManager, seeds.nuisance, clock);
        this.events.add(
            this.nuisanceMondManager.addHandler("startDamage", () => {
                this.damagePenalty = 0;
            }),
            this.nuisanceMondManager.addHandler("finishDamage", () => {
                // 通常落下分と演出省略分を合わせ、被弾1回につき終了時に一度だけ知らせる。
                this.notifyDamagePenalty();
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
                this.damagePenalty += 1;
                if (GraphicSetting.damageEffects) this.animations.damageBoard.play();
            }),
            this.nuisanceMondManager.addHandler("collapseDamage", (remaining: number) => {
                // 処理中に届いた次の攻撃も、空の盤面では全量がペナルティになる。
                const queued = this.damageInfo.temporaryDamageTask;
                this.damageInfo.temporaryDamageTask = 0;
                this.damageInfo.totalDamage += queued;
                const penalty = remaining + queued;
                this.playInfo.penalty += penalty;
                this.damagePenalty += penalty;
                this.feedback.collapseBoard();
                this.updateGameTime();
            }),
            this.nuisanceMondManager.addHandler("progress", () => {
                this.canvas.readData(this.operator.g$graphicData);
                this.canvas.paintPlayCanvas();
            }),
            this.operator.addHandler("put", () => {
                if (GraphicSetting.putShake) {
                    this.animations.put.play();
                }
                MusicManager.get("設置音")?.play();
            }),
            this.operator.addHandler(["move-left", "move-right", "move-down-direct"], () => MusicManager.get("移動音")?.play()),
            this.operator.addHandler("slide-down", () => MusicManager.get("滑り移動音")?.play()),
            this.operator.addHandler("spin-left", () => MusicManager.get("左回転音")?.play()),
            this.operator.addHandler("spin-right", () => MusicManager.get("右回転音")?.play())
        );
        this.input = input;
        if (this.input instanceof AutoInputObserver) {
            this.input.setInputGate(() => !this.state.damaging && !this.state.hasFinished);
            this.input.attachClock(clock);
        }
        this.playField.classList.add("playField");
        const board = document.createElement("div");
        board.className = "boardView";
        board.append(this.canvas.g$playCanvas, this.feedback.rowFlash, this.feedback.boardCollapse);
        this.playField.appendChild(board);
        this.playField.appendChild(this.canvas.g$nextCanvas);
        this.playField.appendChild(this.label.g$element);
        this.playField.appendChild(this.feedback.element);
        if (playerCount > 1) {
            this.playField.classList.add("multiplayerField");
            this.playField.style.setProperty("--player-count", String(playerCount));
            if (playerCount >= 3) this.playField.classList.add("compactPlayField");
        }
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
        this.playField.classList.remove("feedbackPaused");
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
        this.playField.classList.add("feedbackPaused");
        this.loop.stop();
        this.operator.stop();
        this.nuisanceMondManager.stop();
        this.runningAnimations = Object.values(this.animations).filter((animation) => animation.playState === "running");
        this.runningAnimations.forEach((animation) => {
            animation.pause();
        });
        if (this.input instanceof AutoInputObserver) this.input.stop();
    }

    setPlaybackSpeed(speed: number) {
        this.loop.s$speedMagnification = speed;
        this.nuisanceMondManager.setPlaybackSpeed(speed);
        if (this.input instanceof AutoInputObserver) this.input.setPlaybackSpeed(speed);
        Object.values(this.animations).forEach((animation) => (animation.playbackRate = speed));
        this.playField.style.setProperty("--feedback-duration", `${200 / speed}ms`);
    }

    dispose(): void {
        this.stop();
        this.events.dispose();
        this.feedback.dispose();
        this.nuisanceMondManager.dispose();
        Object.values(this.animations).forEach((animation) => animation.cancel());
        this.runningAnimations = [];
        if (this.input instanceof AutoInputObserver) this.input.setInputGate(() => false);
        this.playField.remove();
    }

    finish() {
        // 被弾途中で時間切れになった場合も、実際に減った分はまとめて知らせる。
        this.notifyDamagePenalty();
        this.stop();
        this.playInfo.playTime = this.loop.g$elapsedTime;
        this.updateGameTime();
        this.state.hasFinished = true;
        this.animations.timeWarning.cancel();
    }

    private notifyDamagePenalty(): void {
        if (this.damagePenalty > 0) this.feedback.show("ダメージ", `持ち時間 −${this.damagePenalty}`, "penalty");
        this.damagePenalty = 0;
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
        if (GraphicSetting.damageEffects) this.animations.caution.play();
    }

    private proceedTemporaryDamageTask() {
        if (this.state.damaging || this.state.hasFinished) {
            return;
        }
        if (this.damageInfo.temporaryDamageTask > 0) {
            this.damageInfo.damageTask += this.damageInfo.temporaryDamageTask;
            this.damageInfo.temporaryDamageTask = 0;
            this.damageInfo.lastDamageTime = this.loop.g$elapsedTime;
            if (GraphicSetting.damageEffects) this.animations.caution.play();
        }
    }

    damage() {
        if (this.state.damaging || this.damageInfo.damageTask == 0 || this.state.hasFinished) {
            return;
        }
        this.state.damaging = true;
        this.feedback.show("ダメージ", "攻撃を受ける", "penalty");
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
