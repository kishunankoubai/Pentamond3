import { MyEventListener } from "../MyEventListener";

type Job = { at: number; priority: number; order: number; serial: number; active: boolean; run: () => void };

/** 入力・時間制限・ダメージを、同じ整数ミリ秒の時系列で実行する時計。 */
export class SimulationClock extends MyEventListener {
    private jobs: Job[] = [];
    private serial = 0;
    private ownerOrder = 0;
    private time = 0;
    private running = false;
    private advancing = false;
    private frame: number | null = null;
    private anchorWall = 0;
    private anchorTime = 0;
    private speed = 1;

    get now(): number { return this.time; }
    get isRunning(): boolean { return this.running; }
    get playbackSpeed(): number { return this.speed; }
    allocateOrder(): number { return this.ownerOrder++; }

    schedule(at: number, run: () => void, priority = 0, order = this.allocateOrder()): () => void {
        if (!Number.isFinite(at) || at < 0) throw new Error("ゲーム内時刻が不正です");
        const job: Job = { at: Math.max(this.time, Math.ceil(at)), run, priority, order, serial: this.serial++, active: true };
        this.jobs.push(job);
        let index = this.jobs.length - 1;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (!this.before(job, this.jobs[parent])) break;
            this.jobs[index] = this.jobs[parent];
            index = parent;
        }
        this.jobs[index] = job;
        return () => { job.active = false; };
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.anchorTime = this.time;
        this.anchorWall = performance.now();
        this.frame = requestAnimationFrame(() => this.tick());
    }

    stop(): void {
        this.synchronize();
        this.running = false;
        if (this.frame !== null) cancelAnimationFrame(this.frame);
        this.frame = null;
    }

    setPlaybackSpeed(speed: number): void {
        if (!Number.isFinite(speed) || speed <= 0) return;
        this.synchronize();
        this.speed = speed;
        this.anchorTime = this.time;
        this.anchorWall = performance.now();
    }

    synchronize(): void {
        if (this.running && !this.advancing) this.advanceTo(this.anchorTime + Math.floor((performance.now() - this.anchorWall) * this.speed));
    }

    /** 処理落ちでも順番やステップを捨てず、追いつくまで次フレームへ持ち越す。 */
    advanceTo(target: number): void {
        if (this.advancing || !this.running) return;
        this.advancing = true;
        try {
            let budget = 10000;
            while (this.jobs.length && this.running) {
                const job = this.jobs[0];
                if (!job.active) { this.pop(); continue; }
                if (job.at > target) break;
                if (--budget < 0) return;
                this.pop();
                this.time = job.at;
                job.run();
            }
            if (this.running) this.time = Math.max(this.time, Math.floor(target));
        } catch (error) {
            this.stop();
            this.executeEvent("error", error);
        } finally { this.advancing = false; }
    }

    dispose(): void {
        this.stop();
        this.jobs = [];
        this.removeAllEvent();
    }

    private tick(): void {
        this.frame = null;
        this.synchronize();
        if (this.running) this.frame = requestAnimationFrame(() => this.tick());
    }

    private before(a: Job, b: Job): boolean {
        return a.at < b.at || a.at === b.at && (a.priority < b.priority || a.priority === b.priority && (a.order < b.order || a.order === b.order && a.serial < b.serial));
    }

    private pop(): void {
        const last = this.jobs.pop()!;
        if (!this.jobs.length) return;
        let index = 0;
        while (index * 2 + 1 < this.jobs.length) {
            let child = index * 2 + 1;
            if (child + 1 < this.jobs.length && this.before(this.jobs[child + 1], this.jobs[child])) child++;
            if (!this.before(this.jobs[child], last)) break;
            this.jobs[index] = this.jobs[child];
            index = child;
        }
        this.jobs[index] = last;
    }
}
