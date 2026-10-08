import { MyEventListener } from "../MyEventListener";
import { SimulationClock } from "./SimulationClock";

/** LoopManagerと同じイベントを、専用RAFではなく共通時計で発行する。 */
export class SimulationLoop extends MyEventListener {
    private frequency = 1000 / 60;
    private elapsed = 0;
    private startedAt = 0;
    private started = false;
    private running = false;
    private count = 0;
    private generation = 0;
    private cancel: (() => void) | null = null;
    private readonly order: number;
    constructor(readonly clock: SimulationClock) { super(); this.order = clock.allocateOrder(); }

    get g$elapsedTime(): number { return this.elapsed + (this.running ? this.clock.now - this.startedAt : 0); }
    get g$isStopping(): boolean { return !this.running; }
    get g$hasStarted(): boolean { return this.started; }
    get g$loopFrequency(): number { return this.frequency; }
    get g$speedMagnification(): number { return this.clock.playbackSpeed; }
    set s$speedMagnification(_speed: number) { /* 速度は時計全体に一度だけ適用する。 */ }
    set s$loopFrequency(value: number) {
        if (this.running || !Number.isFinite(value) || value <= 0) throw new Error("ループ頻度が不正です");
        this.frequency = value;
        this.count = Math.floor(this.elapsed / value);
    }

    start(_speed = this.clock.playbackSpeed): void {
        if (this.running) return;
        this.running = this.started = true;
        this.startedAt = this.clock.now;
        this.schedule();
        this.executeEvent("start", this);
    }
    stop(): void {
        if (!this.running) return;
        this.elapsed = this.g$elapsedTime;
        this.running = false;
        ++this.generation;
        this.cancel?.();
        this.cancel = null;
        this.executeEvent("stop", this);
    }
    reset(): void {
        this.stop();
        this.elapsed = this.count = 0;
        this.started = false;
        this.executeEvent("reset", this);
    }
    private schedule(): void {
        const generation = this.generation;
        const at = this.clock.now + Math.max(1, Math.ceil((this.count + 1) * this.frequency) - this.g$elapsedTime);
        this.cancel = this.clock.schedule(at, () => {
            if (!this.running || generation !== this.generation) return;
            ++this.count;
            this.executeEvent("loop", this);
            if (!this.running || generation !== this.generation) return;
            this.executeEvent("latestFrameLoop", this);
            if (this.running && generation === this.generation) this.schedule();
        }, 0, this.order);
    }
}
