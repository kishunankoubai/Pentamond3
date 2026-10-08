import { bindPlayerControls } from "../PlayerControls";
import { GameMode } from "../GameMode";
import { GamePlayer } from "../GamePlayer";
import { playBackground } from "../../PlayBackground";
import { GraphicSetting } from "../../GraphicSetting";
import { MusicManager } from "../../Utilities/Music/MusicManager";
import { SimulationClock } from "../../Utilities/Loop/SimulationClock";

export class Mode2 extends GameMode {
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
        p.canvas.guideBorder = true;
        p.canvas.guideBorderHeight = p.playInfo.targetLines;
        this.events.add(
            p.loop.addHandler("loop", () => {
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
                const continuesChain = !!lastTrick && ["一列揃え(上)", "一列揃え(下)"].includes(lastTrick.name);
                const removeSoundIndex = continuesChain ? Math.min(6, p.playInfo.chain) : 0;
                if (lastTrick) {
                    p.playInfo.trickCount += 1;
                    if (["一列揃え(上)", "一列揃え(下)"].includes(lastTrick.name)) {
                        p.playInfo.line += 1;
                        p.playInfo.score += p.playInfo.chain * 100;
                        p.playInfo.score += (lastTrick.time + lastTrick.attack) * 50;
                        p.playInfo.chain += 1;
                        p.playInfo.maxChain = Math.max(p.playInfo.maxChain, p.playInfo.chain);
                        p.canvas.guideBorderHeight = p.playInfo.targetLines - p.playInfo.line;
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
                if (lastTrick) MusicManager.get(`消去音${removeSoundIndex}`)?.play();

                if (p.playInfo.line >= p.playInfo.targetLines) {
                    p.finish();
                    this.proceedPlayerFinish();
                }
            })
        );
    }
}
