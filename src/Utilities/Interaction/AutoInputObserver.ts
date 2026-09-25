import { LoopManager } from "../Loop/LoopManager";
import { InputObserver } from "./InputObserver";

export type AutoInputData = {
    time: number;
    keyCode: string;
    type: "keydown" | "keyup" | "downup";
};

/** 保存された入力列を時刻どおりに再生する仮想入力。 */
export class AutoInputObserver extends InputObserver {
    protected type = "autoKeyboard";
    private readonly loop = new LoopManager();
    private inputData: AutoInputData[] = [];
    private pendingInputData: AutoInputData[] = [];

    constructor(inputData: AutoInputData[] = []) {
        super();
        this.loop.addHandler("loop", () => this.processInput());
        this.s$inputData = inputData;
    }

    get g$inputData(): AutoInputData[] {
        return structuredClone(this.inputData);
    }

    set s$inputData(inputData: AutoInputData[]) {
        this.inputData = structuredClone(inputData);
        this.pendingInputData = structuredClone(inputData);
    }

    start(): void {
        this.isValid = true;
        if (this.pendingInputData.length) this.loop.start();
    }

    stop(): void {
        this.loop.stop();
        this.isValid = false;
        this.validInputs = [];
    }

    playStart(): void {
        this.start();
    }

    playReset(): void {
        this.loop.reset();
        this.validInputs = [];
        this.pendingInputData = structuredClone(this.inputData);
    }

    private processInput(): void {
        while (this.pendingInputData.length && this.pendingInputData[0].time <= this.loop.g$elapsedTime) {
            const input = this.pendingInputData.shift()!;
            if (input.type === "keydown" || input.type === "downup") this.onValidInput(input.keyCode);
            if (input.type === "keyup" || input.type === "downup") this.onInvalidInput(input.keyCode);
        }
        if (!this.pendingInputData.length) this.loop.stop();
    }
}
