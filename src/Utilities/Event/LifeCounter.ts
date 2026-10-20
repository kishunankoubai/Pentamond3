export class LifeCounter {
    private readonly life: number;
    private count: number = 0;

    constructor(life: number = Infinity) {
        this.life = life;
    }

    get g$life(): number {
        return this.life;
    }

    get g$count(): number {
        return this.count;
    }

    get g$finished(): boolean {
        return this.life == this.count;
    }

    countUp() {
        if (this.count < this.life) this.count++;
    }
}
