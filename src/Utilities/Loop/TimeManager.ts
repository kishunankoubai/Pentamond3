import { MyEventListener } from "../MyEventListener";

export class TimeManager extends MyEventListener {
    /*
     * start
     * stop
     * reset
     */
    protected lastElapsedTime: number = 0;
    private intervalStartTime: number | null = null;
    private lastStopTime: number | null = 0;
    private speedMagnification: number = 1;

    get g$hasStarted(): boolean {
        return this.intervalStartTime != null ? true : false;
    }

    get g$isStopping(): boolean {
        return this.lastStopTime != null;
    }

    get g$speedMagnification(): number {
        return this.speedMagnification;
    }

    set s$speedMagnification(speedMagnification: number) {
        if (!Number.isFinite(speedMagnification) || speedMagnification <= 0) return;

        if (!this.g$isStopping) {
            this.lastElapsedTime = this.g$elapsedTime;
            this.intervalStartTime = performance.now();
        }
        this.speedMagnification = speedMagnification;
    }

    reset() {
        this.lastElapsedTime = 0;
        this.intervalStartTime = null;
        this.lastStopTime = 0;
        this.speedMagnification = 1;
        this.executeEvent("reset", this);
    }

    start(speedMagnification: number = this.speedMagnification) {
        if (!this.g$isStopping) { this.s$speedMagnification = speedMagnification; return; }
        this.intervalStartTime = performance.now();
        if (Number.isFinite(speedMagnification) && speedMagnification > 0) this.speedMagnification = speedMagnification;
        this.lastStopTime = null;
        this.executeEvent("start", this);
    }

    stop() {
        if (this.g$isStopping) return;
        this.lastElapsedTime = this.g$elapsedTime;
        this.lastStopTime = performance.now();
        this.executeEvent("stop", this);
    }

    get g$elapsedTime(): number {
        if (this.intervalStartTime === null) return 0;
        if (this.lastStopTime !== null) return this.lastElapsedTime;
        return (performance.now() - this.intervalStartTime) * this.speedMagnification + this.lastElapsedTime;
    }
}
