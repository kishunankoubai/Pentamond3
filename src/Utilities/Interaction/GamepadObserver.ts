import { GamepadAxisInfo, GamepadButtonInfo, GamepadInput } from "./GamepadInput";
import { InputObserver } from "./InputObserver";

export class GamepadObserver extends InputObserver {
    protected type: string = "gamepad";
    private gamepadInput: GamepadInput;
    private index: number;
    //inputNameはbutton:*buttonIndex*、stick:+*axisIndex*、stick:-*axisIndex*の形

    constructor(index: number) {
        super();
        this.index = index;
        this.gamepadInput = new GamepadInput(index);
        this.gamepadInput.addHandler("buttonDown", (e: GamepadButtonInfo) => {
            this.onValidInput("button:" + e.buttonIndex);
        });
        this.gamepadInput.addHandler("buttonUp", (e: GamepadButtonInfo) => {
            this.onInvalidInput("button:" + e.buttonIndex);
        });
        this.gamepadInput.addHandler("axisActive", (e: GamepadAxisInfo) => {
            this.onValidInput(`stick:${e.value > 0 ? "+" : "-"}${e.axisIndex}`);
        });
        this.gamepadInput.addHandler("axisInactive", (e: GamepadAxisInfo) => {
            this.onInvalidInput(`stick:${e.value > 0 ? "+" : "-"}${e.axisIndex}`);
        });
    }

    get g$index(): number {
        return this.index;
    }

    start() {
        if (this.isValid) return;

        this.gamepadInput.start();
        this.isValid = true;
    }

    stop() {
        if (!this.isValid) return;

        this.isValid = false;
        this.gamepadInput.stop();
        this.validInputs = [];
    }
}
