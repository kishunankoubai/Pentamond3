import { MyEvent, MyEventListener } from "../MyEventListener";
import { AutoInputObserver } from "./AutoInputObserver";
import { GamepadObserver } from "./GamepadObserver";
import { InputObserver } from "./InputObserver";
import { KeyboardObserver } from "./KeyboardObserver";

export class InputManager extends MyEventListener {
    private static instance: InputManager;
    private inputs: InputObserver[] = [];
    private registeredInputs: InputObserver[] = [];
    private registerEvents = new Map<InputObserver, MyEvent>();
    private registering = false;
    private maxInputNumber = 4;

    constructor() {
        super();
        if (InputManager.instance) return InputManager.instance;
        InputManager.instance = this;

        this.addInput(new KeyboardObserver());
        window.addEventListener("gamepadconnected", (event) => {
            const exists = this.inputs.some((input) => input instanceof GamepadObserver && input.g$index === event.gamepad.index);
            if (exists) return;

            const input = new GamepadObserver(event.gamepad.index);
            this.addInput(input);
            if (this.registering) this.addRegisterEvent(input);
            this.executeEvent("addedNewInput", input);
        });
    }

    get g$inputs(): InputObserver[] {
        return [...this.inputs];
    }

    get g$registeredInputs(): InputObserver[] {
        return [...this.registeredInputs];
    }

    get g$registeredInputNumber(): number {
        return this.registeredInputs.length;
    }

    get g$maxInputNumber(): number {
        return this.maxInputNumber;
    }

    get g$registering(): boolean {
        return this.registering;
    }

    set s$maxInputNumber(maxInputNumber: number) {
        this.maxInputNumber = Math.max(1, Math.floor(maxInputNumber));
    }

    start(): void {
        this.inputs.forEach((input) => input.start());
    }

    stop(): void {
        this.inputs.forEach((input) => input.stop());
    }

    startRegister(): void {
        this.resetRegister();
        this.registering = true;
        this.inputs.filter((input) => !(input instanceof AutoInputObserver)).forEach((input) => this.addRegisterEvent(input));
        this.start();
    }

    finishRegister(): void {
        if (!this.registering) return;
        this.clearRegisterEvents();
        this.registering = false;
        this.executeEvent("finishRegister");
    }

    resetRegister(): void {
        this.clearRegisterEvents();
        this.registering = false;
        this.registeredInputs = [];
    }

    register(input: InputObserver): void {
        if (this.registeredInputs.length >= this.maxInputNumber) return;
        this.addInput(input, !(input instanceof AutoInputObserver));
        if (this.registeredInputs.includes(input)) return;
        this.registeredInputs.push(input);
        this.executeEvent("inputRegistered", input);
        if (this.registeredInputs.length >= this.maxInputNumber) this.finishRegister();
    }

    removeVirtualInputs(): void {
        this.inputs
            .filter((input) => input instanceof AutoInputObserver)
            .forEach((input) => {
                input.stop();
                input.removeAllEvent();
            });
        this.inputs = this.inputs.filter((input) => !(input instanceof AutoInputObserver));
        this.registeredInputs = this.registeredInputs.filter((input) => !(input instanceof AutoInputObserver));
    }

    private addInput(input: InputObserver, start: boolean = true): void {
        if (this.inputs.includes(input)) return;
        this.inputs.push(input);
        input.addHandler("inputValid", (info: unknown) => this.executeEvent("inputValid", [input, info]));
        input.addHandler("inputInvalid", (info: unknown) => this.executeEvent("inputInvalid", [input, info]));
        if (start) input.start();
    }

    private addRegisterEvent(input: InputObserver): void {
        if (this.registerEvents.has(input)) return;
        this.registerEvents.set(input, input.addHandler("inputValid", () => this.register(input)));
    }

    private clearRegisterEvents(): void {
        this.registerEvents.forEach((event, input) => input.removeEvent(event));
        this.registerEvents.clear();
    }
}

export const inputManager = new InputManager();
