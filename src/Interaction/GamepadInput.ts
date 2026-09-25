import { LoopManager } from "../Utilities/Loop/LoopManager";

export interface GamepadButtonEvent {
    /**
     * gamepadのindex
     */
    gamepadIndex: number;
    /**
     * buttonのindex
     */
    buttonIndex: number;
    /**
     * 押されているかどうか
     */
    pressed: boolean;
}

export interface GamepadAxisEvent {
    /**
     * gamepadのindex
     */
    gamepadIndex: number;
    /**
     * axisのindex
     */
    axisIndex: number;
    /**
     * axisの傾き具合(-1~1)
     */
    value: number;
    /**
     * 閾値を超えて有効と判定されているか
     */
    active: boolean;
}

export class GamepadInput {
    private index: number;
    private axisThreshold: number;
    private loop = new LoopManager();
    private lastButtons: boolean[] = [];
    private lastAxesInfo: GamepadAxisEvent[] = [];

    // コールバック
    onButtonDown: ((ev: GamepadButtonEvent) => void) | null = null;
    onButtonUp: ((ev: GamepadButtonEvent) => void) | null = null;
    onAxisActive: ((ev: GamepadAxisEvent) => void) | null = null;
    onAxisInactive: ((ev: GamepadAxisEvent) => void) | null = null;

    constructor(index: number, axisThreshold: number = 0.4) {
        this.index = index;
        this.axisThreshold = axisThreshold;

        const loop = () => {
            const gamepad = navigator.getGamepads()[this.index];
            if (!gamepad) {
                // 切断状態
                return;
            }

            this.processGamepad(gamepad);
        };

        this.loop.addHandler(["loop"], loop.bind(this));
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
    private processGamepad(gp: Gamepad) {
        // ボタン
        gp.buttons.forEach((btn, i) => {
            const isPressed = btn.pressed;
            const wasPressed = this.lastButtons[i] ?? false;

            if (isPressed !== wasPressed) {
                if (isPressed) {
                    this.onButtonDown?.({
                        gamepadIndex: this.index,
                        buttonIndex: i,
                        pressed: true,
                    });
                } else {
                    this.onButtonUp?.({
                        gamepadIndex: this.index,
                        buttonIndex: i,
                        pressed: false,
                    });
                }
            }

            this.lastButtons[i] = isPressed;
        });

        // スティック
        gp.axes.forEach((value, i) => {
            const isActive = Math.abs(value) >= this.axisThreshold;
            const wasActive = this.lastAxesInfo[i] ? this.lastAxesInfo[i].active : false;

            if (isActive !== wasActive) {
                if (isActive) {
                    this.onAxisActive?.({
                        gamepadIndex: this.index,
                        axisIndex: i,
                        value,
                        active: true,
                    });
                } else {
                    this.onAxisInactive?.({
                        gamepadIndex: this.index,
                        axisIndex: i,
                        value: this.lastAxesInfo[i].value ?? 0,
                        active: false,
                    });
                }
            } else if ((this.lastAxesInfo[i] ? this.lastAxesInfo[i].value : 0) * value < 0) {
                if (wasActive) {
                    this.onAxisInactive?.({
                        gamepadIndex: this.index,
                        axisIndex: i,
                        value: this.lastAxesInfo[i].value ?? 0,
                        active: false,
                    });
                }
                if (isActive) {
                    this.onAxisActive?.({
                        gamepadIndex: this.index,
                        axisIndex: i,
                        value,
                        active: true,
                    });
                }
            }

            this.lastAxesInfo[i] = {
                gamepadIndex: this.index,
                axisIndex: i,
                value,
                active: isActive,
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
