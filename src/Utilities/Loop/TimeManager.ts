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

    reset() {
        this.lastElapsedTime = 0;
        this.intervalStartTime = null;
        this.lastStopTime = 0;
        this.speedMagnification = 1;
        this.executeEvent("reset", this);
    }

    start(speedMagnification: number = 1) {
        if (this.lastStopTime == null) this.lastElapsedTime = this.g$elapsedTime;
        this.intervalStartTime = Date.now();
        this.speedMagnification = speedMagnification;
        this.lastStopTime = null;
        this.executeEvent("start", this);
    }

    stop() {
        this.lastElapsedTime = this.g$elapsedTime;
        if (this.lastStopTime == null) this.lastStopTime = Date.now();
        this.executeEvent("stop", this);
    }

    get g$elapsedTime(): number {
        if (!this.intervalStartTime) return 0;
        if (this.lastStopTime) return this.lastElapsedTime;
        return (Date.now() - this.intervalStartTime) * this.speedMagnification + this.lastElapsedTime;
    }
}
