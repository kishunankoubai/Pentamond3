import { EventManager, MyEvent, MyEventListener } from "../MyEventListener";
import { GamepadObserver } from "./GamepadObserver";
import { InputObserver } from "./InputObserver";
import { KeyboardObserver } from "./KeyboardObserver";

export class InputManager extends MyEventListener {
    /*
     * inputValid
     * inputInvalid
     * addedNewInput
     */

    private static instance: InputManager;

    private inputNames: string[] = ["keyboard"];
    private inputs: InputObserver[] = [new KeyboardObserver()];

    constructor() {
        super();
        if (InputManager.instance) return InputManager.instance;
        InputManager.instance = this;

        window.addEventListener("gamepadconnected", (e) => {
            if (this.inputNames.includes(`gamepad:${e.gamepad.index}`)) return;

            this.inputNames.push(`gamepad:${e.gamepad.index}`);
            const input = new GamepadObserver(e.gamepad.index);
            this.inputs.push(input);
            this.addInputEvent(input);
            input.start();
            this.executeEvent("addedNewInput", input);
        });

        this.addInputEvent(this.inputs[0]);
        this.inputs[0].start();
    }

    get g$inputs() {
        return [...this.inputs];
    }

    reset() {
        this.inputs.forEach((input) => {
            input.removeAllEvent();
            this.addInputEvent(input);
        });
        this.removeAllEvent();
    }

    private addInputEvent(input: InputObserver) {
        input.addHandler("inputValid", (item: any) => {
            this.executeEvent("inputValid", [input, item]);
        });
        input.addHandler("inputInvalid", (item: any) => {
            this.executeEvent("inputInvalid", [input, item]);
        });
    }
}

export const inputManager = new InputManager();
