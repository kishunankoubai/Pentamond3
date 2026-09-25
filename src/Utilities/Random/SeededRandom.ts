/** 同じseedから同じ列を生成する軽量な32bit疑似乱数。 */
export class SeededRandom {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let value = this.state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }

    nextInt(max: number): number {
        return Math.floor(this.next() * max);
    }

    shuffle<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

export function createRandomSeed(): number {
    const seed = new Uint32Array(1);
    crypto.getRandomValues(seed);
    return seed[0];
}
