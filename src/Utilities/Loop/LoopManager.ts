import { TimeManager } from "./TimeManager";

export class LoopManager extends TimeManager {
    /*
     * loop
     * latestFrameLoop
     */

    private loopFrequency: number = 0;
    private loopCount: number = 0;
    private loopAnimationFrame: number | null = null;
    private onTime: boolean = true;

    get g$loopFrequency(): number {
        return this.loopFrequency;
    }

    get g$onTime(): boolean {
        return this.onTime;
    }

    set s$loopFrequency(loopFrequency: number) {
        if (this.loopAnimationFrame) {
            console.warn("ループ中にループ頻度は変更できません");
            return;
        }
        this.loopFrequency = loopFrequency;
        this.loopCount = this.getGoalCount(this.loopFrequency);
    }

    set s$onTime(onTime: boolean) {
        this.onTime = onTime;
    }

    reset() {
        if (this.loopAnimationFrame) cancelAnimationFrame(this.loopAnimationFrame);
        this.loopAnimationFrame = null;
        this.loopCount = 0;
        super.reset();
    }

    start(speedMagnification: number = this.g$speedMagnification): void {
        if (!this.loopAnimationFrame) this.loopAnimationFrame = requestAnimationFrame(this.loop.bind(this));
        super.start(speedMagnification);
    }

    stop(): void {
        if (this.loopAnimationFrame) cancelAnimationFrame(this.loopAnimationFrame);
        this.loopAnimationFrame = null;
        super.stop();
    }

    private loop() {
        const goalCount = this.getGoalCount(this.loopFrequency);
        //goalCountが正常値ではないとき(loopFrequencyが0のときなど)
        if (!Number.isFinite(goalCount) || Number.isNaN(goalCount)) {
            this.executeEvent("loop", this);
            this.loopCount++;
            this.executeEvent("latestFrameLoop", this);
        } else if (goalCount > this.loopCount) {
            //onTimeがtrueなら遅れている場合追いつこうとする
            const maxCount = Math.round(((this.loopFrequency * 60) / 1000) * (this.onTime ? 4 : 1));
            if (goalCount - this.loopCount > maxCount) {
                this.lastElapsedTime -= Math.ceil((goalCount - this.loopCount - 1) * this.loopFrequency);
                // console.log(`1frameあたりのループ回数が多すぎます：${goalCount - this.loopCount}`);
                this.executeEvent("loop", this);
                this.loopCount++;
            } else {
                while (goalCount > this.loopCount) {
                    this.executeEvent("loop", this);
                    this.loopCount++;
                }
            }
            this.executeEvent("latestFrameLoop", this);
        }

        if (this.loopAnimationFrame != null) this.loopAnimationFrame = requestAnimationFrame(this.loop.bind(this));
    }

    getGoalCount(goalTime: number): number {
        return Math.floor(this.g$elapsedTime / goalTime);
    }
}
