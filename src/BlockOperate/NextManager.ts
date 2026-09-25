import { BlockKind } from "./Block";
import { SeededRandom } from "../Utilities/Random/SeededRandom";

export class NextManager {
    private next: BlockKind[] = ["L", "J", "p", "q", "U", "I"];
    private next2: BlockKind[];
    private holdKind: BlockKind | null = null;
    private currentKind: BlockKind | null = null;
    private prevKind: BlockKind | null = null;
    private count: number = 0;
    private nextMemory: BlockKind[] = [];
    private random: SeededRandom;

    constructor(seed: number) {
        this.random = new SeededRandom(seed);
        this.next2 = window.structuredClone(this.next);
        this.random.shuffle(this.next);
        this.random.shuffle(this.next2);
        this.nextMemory = window.structuredClone(this.next);
    }

    get g$holdKind(): BlockKind | null {
        return this.holdKind;
    }

    get g$currentKind(): BlockKind | null {
        return this.currentKind;
    }

    get g$next(): BlockKind[] {
        return window.structuredClone(this.next);
    }

    get g$prevKind(): BlockKind | null {
        return this.prevKind;
    }

    get g$count(): number {
        return this.count;
    }

    get g$nextMemory(): BlockKind[] {
        return window.structuredClone(this.nextMemory);
    }

    set s$next(next: BlockKind[]) {
        this.next = window.structuredClone(next);
        this.next2 = [];
    }

    forgetPrev() {
        this.prevKind = null;
    }

    private popNext() {
        if (this.next.length == this.next2.length) {
            this.next.push(this.next2[this.count % this.next2.length]);
            this.nextMemory.push(this.next[this.next2.length]!);
        }
        this.currentKind = this.next.shift()!;
        this.count++;
        if (this.count % this.next2.length == 0) {
            this.random.shuffle(this.next2);
        }
    }

    proceed() {
        this.prevKind = this.currentKind;
        this.popNext();
    }

    hold() {
        if (!this.currentKind) {
            return;
        }
        if (!this.holdKind) {
            this.holdKind = this.currentKind;
            this.popNext();
        } else {
            [this.holdKind, this.currentKind] = [this.currentKind, this.holdKind];
        }
    }

    back() {
        if (!this.prevKind) {
            return;
        }
        this.count--;
        this.next.unshift(this.currentKind!);
        this.currentKind = this.prevKind;
        this.prevKind = null;
    }
}
