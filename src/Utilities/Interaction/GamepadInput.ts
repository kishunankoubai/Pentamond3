import { LoopManager } from "../Loop/LoopManager";
import { MyEventListener } from "../MyEventListener";

export interface GamepadButtonInfo {
    buttonIndex: number;
    pressed: boolean;
}

export interface GamepadAxisInfo {
    axisIndex: number;
    value: number;
    active: boolean;
}

export class GamepadInput extends MyEventListener {
    private readonly index: number;
    private axisThreshold: number;
    private readonly loop = new LoopManager();
    private lastButtons: boolean[] = [];
    private lastAxesInfo: GamepadAxisInfo[] = [];

    constructor(index: number, axisThreshold: number = 0.4) {
        super();
        this.index = index;
        this.axisThreshold = axisThreshold;

        this.loop.addHandler("loop", () => {
            const gamepad = navigator.getGamepads()[this.index];
            if (!gamepad) return;

            this.updateGamepad(gamepad);
        });
        this.loop.s$onTime = false;
    }

    get g$connecting(): boolean {
        return navigator.getGamepads()[this.index] != null;
    }

    /**
     * ループ開始
     */
    start() {
        this.loop.start();
    }

    /**
     * ボタン/スティックの状態変化を処理
     */
    private updateGamepad(gamepad: Gamepad) {
        // ボタン
        gamepad.buttons.forEach((button, i) => {
            if (button.pressed !== (this.lastButtons[i] ?? false)) {
                const buttonInfo = {
                    buttonIndex: i,
                    pressed: button.pressed,
                };

                if (button.pressed) this.executeEvent("buttonDown", buttonInfo);
                else this.executeEvent("buttonUp", buttonInfo);
            }

            this.lastButtons[i] = button.pressed;
        });

        // スティック
        gamepad.axes.forEach((value, i) => {
            const nowState = value >= this.axisThreshold ? "+" : -value >= this.axisThreshold ? "-" : "none";
            const lastState = this.lastAxesInfo[i] ? (this.lastAxesInfo[i].active ? (this.lastAxesInfo[i].value > 0 ? "+" : "-") : "none") : "none";

            if (nowState !== lastState) {
                if (lastState != "none") {
                    this.executeEvent("axisInactive", {
                        axisIndex: i,
                        value: this.lastAxesInfo[i].value,
                        active: false,
                    });
                }
                if (nowState != "none") {
                    this.executeEvent("axisActive", {
                        axisIndex: i,
                        value: value,
                        active: true,
                    });
                }
            }

            this.lastAxesInfo[i] = {
                axisIndex: i,
                value,
                active: nowState != "none",
            };
        });
    }

    /**
     * ループ停止
     */
    stop() {
        this.loop.stop();
    }
}
