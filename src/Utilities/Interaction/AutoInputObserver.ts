import { LoopManager } from "../Loop/LoopManager";
import { InputObserver } from "./InputObserver";
import { SimulationClock } from "../Loop/SimulationClock";

export type AutoInputData = {
    time: number;
    keyCode: string;
    type: "keydown" | "keyup" | "downup";
    /** 同時刻の複数プレイヤー操作の実行順。 */
    sequence?: number;
};

/** 保存された入力列を時刻どおりに再生する仮想入力。 */
export class AutoInputObserver extends InputObserver {
    protected type = "autoKeyboard";
    private readonly loop = new LoopManager();
    private inputData: AutoInputData[] = [];
    private nextInputIndex = 0;
    private inputGate: () => boolean = () => true;
    private clock: SimulationClock | null = null;
    private cancelScheduled: (() => void) | null = null;

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
        this.nextInputIndex = 0;
    }

    start(): void {
        if (this.isValid) return;
        this.isValid = true;
        if (this.clock) this.scheduleNext();
        else if (this.nextInputIndex < this.inputData.length) this.loop.start();
    }

    stop(): void {
        this.cancelScheduled?.();
        this.cancelScheduled = null;
        this.loop.stop();
        this.isValid = false;
        this.validInputs = [];
    }

    playStart(): void {
        this.start();
    }

    playReset(): void {
        this.stop();
        this.loop.reset();
        this.validInputs = [];
        this.nextInputIndex = 0;
    }

    setPlaybackSpeed(speed: number): void {
        if (!this.clock) this.loop.s$speedMagnification = speed;
    }

    setInputGate(inputGate: () => boolean): void {
        this.inputGate = inputGate;
    }

    attachClock(clock: SimulationClock): void {
        this.stop();
        this.clock = clock;
    }

    private scheduleNext(): void {
        const clock = this.clock;
        const input = this.inputData[this.nextInputIndex];
        if (!clock || !this.isValid || !input) return;
        this.cancelScheduled = clock.schedule(input.time, () => {
            this.cancelScheduled = null;
            if (!this.isValid) return;
            if (!this.inputGate()) throw new Error("リプレイの操作時刻と盤面の状態が一致しません");
            ++this.nextInputIndex;
            if (input.type === "keydown" || input.type === "downup") this.onValidInput(input.keyCode);
            if (input.type === "keyup" || input.type === "downup") this.onInvalidInput(input.keyCode);
            this.scheduleNext();
        }, 1, input.sequence ?? this.nextInputIndex);
    }

    private processInput(): void {
        while (this.isValid && this.nextInputIndex < this.inputData.length && this.inputData[this.nextInputIndex].time <= this.loop.g$elapsedTime) {
            // ダメージ硬直などで操作不能なら、入力を捨てずに次フレームまで待つ。
            if (!this.inputGate()) return;
            const input = this.inputData[this.nextInputIndex++];
            if (input.type === "keydown" || input.type === "downup") this.onValidInput(input.keyCode);
            if (input.type === "keyup" || input.type === "downup") this.onInvalidInput(input.keyCode);
        }
        if (this.nextInputIndex >= this.inputData.length) this.loop.stop();
    }
}
