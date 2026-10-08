import { BlockKind, BlockProperty } from "../BlockOperate/Block";
import { BlockManager } from "../BlockOperate/BlockManager";
import { Pentiamond } from "../BlockOperate/Pentiamond";
import { GraphicData } from "../CanvasManager";
import { OperateName } from "../Game/GameMode";
import * as Settings from "../Settings";
import { LessonId, operationLessons } from "./OperationLessons";

import type { PracticeOutcome, PracticePhase } from "./TutorialTypes";
const bottom = Settings.playHeight - 1;
const movement: OperateName[] = ["move-left", "move-right", "move-down", "put"];

/** 通常ゲームの時間・ランダム・記録処理から独立した教材。衝突・回転・消去は本体と共通。 */
export class PracticeBoard {
    readonly lesson: typeof operationLessons[number];
    blocks = new BlockManager();
    hand: Pentiamond | null = null;
    phase: PracticePhase = "targets";
    placed = 0;
    erased = 0;
    horizontalMoves = 0;
    hold: BlockKind | null = null;
    private target: Pentiamond | null = null;
    private next: BlockKind[] = [];
    private undo: { terrain: BlockProperty[][]; kind: BlockKind; hold: BlockKind | null; next: BlockKind[] } | null = null;
    private usedSkill = false;
    private chain = 0;
    private pendingTarget = false;

    constructor(readonly index: number) {
        this.lesson = operationLessons[index];
        this.restart(true);
    }

    restart(withIntroduction = false): void {
        this.placed = this.erased = 0;
        this.horizontalMoves = 0;
        this.pendingTarget = false;
        this.chain = 0;
        this.hold = null;
        this.undo = null;
        if (this.lesson.id === "move" && withIntroduction) {
            this.blocks = new BlockManager();
            this.target = null;
            this.next = ["I", "I", "I", "I"];
            this.spawn("I");
            this.phase = "horizontal";
        } else this.prepareTarget();
    }

    get allowed(): OperateName[] {
        if (this.pendingTarget) return [];
        if (this.phase === "horizontal") return ["move-left", "move-right"];
        if (this.phase === "down") return ["move-left", "move-right", "move-down"];
        if (["firstPut", "autoPut", "undoPut"].includes(this.phase)) return ["put"];
        if (this.phase === "undoBack") return ["unput"];
        if (this.phase === "erasing") return ["removeLine"];
        if (this.phase !== "targets") return [];
        const result = [...movement];
        if (this.lesson.id === "rotate") result.push("spin-left", "spin-right");
        if (this.lesson.id === "hold") result.push("hold");
        if (this.lesson.id === "undo") result.push("unput");
        return result;
    }

    /** 説明を挟まない課題は即座に、会話がある課題は会話後に進める。 */
    continueAfterObservation(): void {
        if (!this.pendingTarget && this.phase !== "autoPutReview") return;
        this.pendingTarget = false;
        this.prepareTarget();
    }

    get targets() { return this.phase === "targets" ? this.target?.g$states ?? [] : []; }

    get graphics(): GraphicData {
        const ghost = this.hand?.g$copy;
        if (this.hand && ghost && this.hand.g$visible) {
            this.blocks.removePentiamond(this.hand);
            ghost.s$visible = false;
            this.blocks.displayPentiamond(ghost);
            while (this.blocks.fall(ghost)) { /* 真下の着地点 */ }
            this.blocks.removePentiamond(ghost);
            this.blocks.displayPentiamond(this.hand);
        }
        return { blockProperties: this.blocks.g$blockProperties, ghostMondState: ghost?.g$states ?? [], next: this.next, hold: this.hold };
    }

    apply(operation: OperateName): PracticeOutcome {
        if (!this.allowed.includes(operation)) return {};
        if (operation === "removeLine") {
            const trick = this.blocks.removeLine();
            this.erased++;
            if (this.erased === 5) this.phase = "done";
            // 役なしの列には消去音を鳴らさない。
            const sound = trick ? `消去音${Math.min(6, this.chain++)}` : undefined;
            if (!trick) this.chain = 0;
            return { trick: trick?.name ?? "役なし", sound };
        }
        if (operation === "unput") {
            if (!this.undo) return {};
            if (this.hand) this.blocks.removePentiamond(this.hand);
            const snapshot = this.undo;
            this.blocks.load(snapshot.terrain);
            this.hold = snapshot.hold;
            this.next = [...snapshot.next];
            this.spawn(snapshot.kind);
            this.undo = null;
            this.usedSkill = true;
            this.phase = "targets";
            return { sound: "ボタン" };
        }
        if (!this.hand?.g$visible) return { failed: true };
        if (operation.startsWith("move-")) {
            const direction = operation.slice(5) as "left" | "right" | "down";
            const x = this.hand.g$x;
            const moved = this.blocks.move(this.hand, direction, this.lesson.id === "slide");
            if (!moved) return {};
            const slid = direction === "down" && this.hand.g$x !== x;
            if (slid) this.usedSkill = true;
            if (this.phase === "horizontal") {
                this.horizontalMoves++;
                if (this.horizontalMoves >= 20) this.phase = "down";
            }
            else if (this.phase === "down" && !this.blocks.canFall(this.hand)) this.phase = "firstPut";
            return { sound: slid ? "滑り移動音" : "移動音" };
        }
        if (operation === "spin-left" || operation === "spin-right") {
            const rotated = this.blocks.spin(this.hand, operation === "spin-left" ? "left" : "right");
            return rotated ? { sound: operation === "spin-left" ? "左回転音" : "右回転音" } : {};
        }
        if (operation === "hold") {
            const current = this.hand.g$kind;
            const replacement = this.hold ?? this.next.shift();
            if (!replacement) return {};
            this.blocks.removePentiamond(this.hand);
            this.hold = current;
            this.spawn(replacement);
            this.usedSkill = true;
            return { sound: "ボタン" };
        }
        if (operation !== "put") return {};
        // 一手戻し用の状態は設置の直前の「地形だけ」。移動状態は初期位置へ戻す。
        this.blocks.removePentiamond(this.hand);
        const terrain = this.blocks.g$blockProperties;
        this.blocks.displayPentiamond(this.hand);
        while (this.blocks.fall(this.hand)) { /* 本体と同じ真下への自動設置 */ }
        this.undo = { terrain, kind: this.hand.g$kind, hold: this.hold, next: [...this.next] };
        if (this.phase === "firstPut") {
            this.spawn("I");
            this.phase = "autoPut";
        } else if (this.phase === "autoPut") {
            // 自動落下を説明する間は、2個とも設置された盤面を保持する。
            this.hand = null;
            this.undo = null;
            this.phase = "autoPutReview";
        } else if (this.phase === "undoPut") {
            this.spawn("I");
            this.phase = "undoBack";
        } else if (!this.matchesTarget() || (["slide", "hold"].includes(this.lesson.id) && !this.usedSkill)) {
            if (this.lesson.id === "undo") {
                this.spawn("I");
                this.phase = "undoBack";
            } else return { failed: true, sound: "設置音" };
        } else {
            this.placed++;
            this.hand = null;
            this.undo = null;
            if (this.placed === this.lesson.count) {
                this.target = null;
                this.phase = this.lesson.id === "erase" ? "erasing" : "done";
            } else {
                this.pendingTarget = true;
                return { sound: "設置音", advance: true };
            }
        }
        return { sound: "設置音" };
    }

    private matchesTarget(): boolean {
        if (!this.hand || !this.target) return false;
        const keys = (mond: Pentiamond) => mond.g$states.map(([x, y, , direction]) => `${x},${y},${direction}`).sort().join(";");
        return this.hand.g$kind === this.target.g$kind && keys(this.hand) === keys(this.target);
    }

    private spawn(kind: BlockKind): void {
        this.hand = new Pentiamond(Settings.initialX, Settings.initialY, kind);
        this.blocks.displayPentiamond(this.hand);
    }

    private prepareTarget(): void {
        const id: LessonId = this.lesson.id;
        this.phase = "targets";
        this.usedSkill = false;
        this.undo = null;
        this.next = ["I", "I", "I", "I"];
        if (id === "move" || id === "rotate") {
            const direction = id === "rotate" ? 3 : 0;
            if (this.placed === 0) {
                this.blocks = new BlockManager();
                for (let x = 0; x <= 5; x++) this.fill(x, bottom, direction === 0);
                this.fill(11, bottom, direction === 0);
                this.fill(5, bottom - 1, direction === 0);
                this.fill(11, bottom - 1, direction === 0);
            }
            const positions = [[14, bottom], [8, bottom], [2, bottom - 1], [14, bottom - 1], [8, bottom - 1]];
            const [x, y] = positions[this.placed];
            this.target = new Pentiamond(x, y, "I", direction);
            this.spawn("I");
        } else if (id === "erase") {
            if (this.placed === 0) {
                this.blocks = new BlockManager();
                // 下2列は役なし。上3列の穴を埋めると一列揃えになる。
                for (let y = bottom - 1; y <= bottom; y++)
                    for (const x of [0, 1, 2, 8, 14, 15, 16]) this.fill(x, y);
                for (let y = bottom - 4; y <= bottom - 2; y++)
                    for (let x = 0; x < Settings.playWidth; x++) if (x < 6 || x > 10) this.fill(x, y);
            }
            this.target = new Pentiamond(8, bottom - 2 - this.placed, "I");
            this.spawn("I");
        } else {
            // 各小課題の最後に一列揃えが完成。達成後は次の教材地形へ切り替える。
            this.blocks = new BlockManager();
            const centers = [4, 12, 6, 10, 8];
            const x = id === "slide" ? centers[this.placed % centers.length] : [12, 4, 10, 6, 8][this.placed % 5];
            const kind: BlockKind = id === "hold" && this.placed % 2 ? "L" : "I";
            this.target = new Pentiamond(x, bottom, kind);
            const holes = new Set(this.target.g$states.filter(([, y]) => y === bottom).map(([x]) => x));
            for (let column = 0; column < Settings.playWidth; column++) if (!holes.has(column)) this.fill(column, bottom);
            if (id === "slide") {
                // 同じ高さでの左移動と真下落下の両方を塞ぐ屋根。右から下入力で滑り込む。
                const terrain = this.blocks.g$blockProperties;
                terrain[x - 3][bottom - 1] = ["g", true, true];
                this.blocks.load(terrain);
            }
            if (id === "hold") {
                this.next = [kind, "I", "L", "I"];
                this.spawn(kind === "I" ? "L" : "I");
            } else {
                this.spawn("I");
                if (id === "undo" && this.placed === 0) this.phase = "undoPut";
            }
        }
    }

    private fill(x: number, y: number, upward = true): void {
        const properties = this.blocks.g$blockProperties;
        properties[x][y] = ["g", (x % 2 === 0) === upward, true];
        this.blocks.load(properties);
    }
}
