import { BlockKind, BlockProperty, ShapeInfo } from "../BlockOperate/Block";
import { BlockManager } from "../BlockOperate/BlockManager";
import { MondOperator } from "../BlockOperate/MondOperator";
import { Pentiamond } from "../BlockOperate/Pentiamond";
import { GraphicData } from "../CanvasManager";
import { OperateName } from "../Game/GameMode";
import * as Settings from "../Settings";
import { trickInfos } from "../Trick";
import { createRandomSeed } from "../Utilities/Random/SeededRandom";
import { PracticeOutcome, PracticePhase } from "./PracticeBoard";
import { trickLessonLayouts } from "./TrickLessonLayouts";
import { trickLessonOffset, trickLessons } from "./TrickLessons";

const bottom = Settings.playHeight - 1;
const kinds: BlockKind[] = ["L", "J", "p", "q", "U", "I"];
const movement: OperateName[] = ["move-left", "move-right", "move-down", "spin-left", "spin-right", "put"];

/** 初期盤面から組み方を体験し、その後は本編の操作・6種一巡で自由に組む。 */
export class TrickPracticeBoard {
    readonly lesson;
    readonly layout;
    readonly trick;
    blocks = new BlockManager();
    hand: Pentiamond | null = null;
    phase: PracticePhase = "targets";
    stage = 0;
    placed = 0;
    erased = 0;
    horizontalMoves = 0;
    private queue: BlockKind[] = [];
    private targetsToPlace: Pentiamond[] = [];
    private chain = 0;
    private undo: { terrain: BlockProperty[][]; kind: BlockKind; placed: number } | null = null;
    private operator: MondOperator | null = null;
    private canUndo = false;

    constructor(readonly index: number) {
        this.lesson = trickLessons[index - trickLessonOffset];
        this.layout = trickLessonLayouts[index - trickLessonOffset];
        // 地割れなどの空き位置も、教材で実際に作る形と完成見本で揃える。
        const shape: ShapeInfo[] = Array.from({ length: Settings.playWidth }, () => [true, false]);
        const targetY = bottom - this.layout.height + 1;
        for (const [kind, x, depth, direction] of this.layout.solution)
            for (const [sx, sy, , d] of new Pentiamond(x, bottom - depth, kind, direction).g$states)
                if (sy === targetY) shape[sx] = [d, true];
        const trick = trickInfos.find((trick) => trick.name === this.layout.trick && trick.shape.every(([d, visible], x) => shape[x][0] === d && shape[x][1] === visible));
        if (!trick) throw new Error(`教習の完成形が「${this.layout.trick}」に一致しません`);
        this.trick = trick;
        this.restart(true);
    }

    get guided(): boolean { return this.stage === 0; }
    get allowed(): OperateName[] {
        if (this.operator) {
            if (this.phase !== "targets") return [];
            return [...(this.operator.isOperable() ? [...movement, "hold" as const] : []), ...(this.canUndo ? ["unput" as const] : []), "removeLine"];
        }
        if (this.phase === "targets") return this.hand?.g$visible ? [...movement, ...(this.undo ? ["unput" as const] : [])] : this.undo ? ["unput"] : [];
        if (this.phase === "erasing") return ["removeLine", ...(this.undo && this.erased === 0 ? ["unput" as const] : [])];
        return [];
    }
    get targets() { return this.guided && this.phase === "targets" ? this.targetsToPlace[this.placed]?.g$states ?? [] : []; }
    get condition(): string { return `「${this.lesson.name}」を2回成立させよう`; }
    get progress(): string { return `成立 ${this.stage} / 2`; }
    get knowledge(): string { return this.lesson.knowledge + (!this.guided ? "地形を整理したいときは、消去を繰り返して盤面を空に戻せます。" : ""); }
    get summary(): string { return this.guided ? `${this.layout.height}段目が目標 ／ 時間制限なし` : "時間制限なし"; }
    get task(): string {
        if (this.phase === "done") return "クリア！";
        if (this.phase === "recoveryReview") return "成立した役を確かめよう";
        if (this.phase === "erasing") return `最下列から消し、「${this.lesson.name}」を成立させよう`;
        if (this.operator) return this.operator.isOperable() ? `「${this.lesson.name}」を作って消去しよう` : "一手戻しや消去で、初期位置を空けよう";
        if (!this.hand?.g$visible) return "一手戻しで、初期位置を空けよう";
        return `「${this.lesson.name}」を組んでみよう`;
    }

    restart(fromBeginning = false): void {
        if (fromBeginning) this.stage = 0;
        this.operator?.stop();
        this.operator = null;
        this.blocks = new BlockManager();
        this.placed = this.erased = this.chain = 0;
        this.undo = null;
        this.canUndo = false;
        this.hand = null;
        this.phase = "targets";
        this.targetsToPlace = [];
        this.queue = [];
        if (!this.guided) {
            this.operator = new MondOperator(createRandomSeed());
            this.blocks = this.operator.blockManager;
            this.operator.start();
            return;
        }
        this.targetsToPlace = this.layout.solution.map(([kind, x, depth, direction]) => new Pentiamond(x, bottom - depth, kind, direction));
        this.queue = this.makeQueue(this.targetsToPlace.map((piece) => piece.g$kind));
        this.spawnNext();
    }

    continueAfterObservation(): void { if (this.phase === "recoveryReview") this.restart(); }

    get graphics(): GraphicData {
        if (this.operator) return this.operator.g$graphicData;
        let ghostStates = this.hand?.g$states ?? [];
        if (this.hand?.g$visible) {
            const ghost = this.hand.g$copy;
            this.blocks.removePentiamond(this.hand);
            ghost.s$visible = false;
            this.blocks.displayPentiamond(ghost);
            while (this.blocks.fall(ghost)) { /* 本編の着地点 */ }
            ghostStates = ghost.g$states;
            this.blocks.removePentiamond(ghost);
            this.blocks.displayPentiamond(this.hand);
        } else ghostStates = [];
        return { blockProperties: this.blocks.g$blockProperties, ghostMondState: ghostStates, next: this.queue.slice(0, Settings.next.length), hold: null };
    }

    apply(operation: OperateName): PracticeOutcome {
        if (!this.allowed.includes(operation)) return {};
        if (this.operator) return this.applyNormal(operation);
        if (operation === "removeLine") return this.erase();
        if (operation === "unput" && this.undo) {
            const snapshot = this.undo;
            if (this.hand) { this.blocks.removePentiamond(this.hand); this.queue.unshift(this.hand.g$kind); }
            this.blocks.load(snapshot.terrain);
            this.placed = snapshot.placed;
            this.undo = null;
            this.phase = "targets";
            this.spawn(snapshot.kind);
            return { sound: "ボタン" };
        }
        if (!this.hand?.g$visible) return {};
        if (operation.startsWith("move-")) {
            const x = this.hand.g$x;
            const direction = operation.slice(5) as "left" | "right" | "down";
            if (!this.blocks.move(this.hand, direction)) return {};
            return { sound: direction === "down" && this.hand.g$x !== x ? "滑り移動音" : "移動音" };
        }
        if (operation.startsWith("spin-")) {
            const left = operation === "spin-left";
            return this.blocks.spin(this.hand, left ? "left" : "right") ? { sound: left ? "左回転音" : "右回転音" } : {};
        }
        if (operation !== "put") return {};
        this.blocks.removePentiamond(this.hand);
        this.undo = { terrain: this.blocks.g$blockProperties, kind: this.hand.g$kind, placed: this.placed };
        this.blocks.displayPentiamond(this.hand);
        while (this.blocks.fall(this.hand)) { /* 真下への設置 */ }
        if (!this.matches(this.targetsToPlace[this.placed])) return { failed: true, sound: "設置音", message: "残った穴の形を確かめて、もう一度やってみましょう。" };
        this.placed++;
        this.chain = 0;
        this.hand = null;
        if (this.placed === this.targetsToPlace.length) this.phase = "erasing";
        else this.spawnNext();
        return { sound: "設置音" };
    }

    /** 時間・スコア・リプレイだけを省き、移動・設置・ホールド・戻し・消去は本編に委譲する。 */
    private applyNormal(operation: OperateName): PracticeOutcome {
        const operator = this.operator!;
        const outcome: PracticeOutcome = {};
        if (operation.startsWith("move-") || operation.startsWith("spin-")) {
            const event = operator.addHandler(operation, () => {
                outcome.sound = operation.startsWith("move-") ? "移動音" : operation === "spin-left" ? "左回転音" : "右回転音";
            });
            const slide = operator.addHandler("slide-down", () => { outcome.sound = "滑り移動音"; });
            if (operation.startsWith("move-")) operator.move(operation.slice(5) as "left" | "right" | "down");
            else operator.spin(operation.slice(5) as "left" | "right");
            operator.removeEvent([event, slide]);
        } else if (operation === "put") {
            operator.put();
            this.placed++;
            this.chain = 0;
            this.canUndo = true;
            outcome.sound = "設置音";
        } else if (operation === "hold") {
            operator.hold();
            outcome.sound = "ボタン";
        } else if (operation === "unput") {
            operator.unput();
            this.placed--;
            this.canUndo = false;
            outcome.sound = "ボタン";
        } else if (operation === "removeLine") {
            operator.removeLine();
            this.erased++;
            this.canUndo = false;
            const trick = operator.g$lastTrick;
            if (trick) {
                outcome.sound = `消去音${Math.min(6, this.chain++)}`;
                outcome.trick = trick.name;
                outcome.message = `${trick.name}が成立しました！`;
                if (this.acceptsTrick(trick.name)) {
                    this.stage++;
                    this.phase = "done";
                    operator.stop();
                }
            } else this.chain = 0;
        }
        return outcome;
    }

    private erase(): PracticeOutcome {
        const trick = this.blocks.removeLine();
        const sound = trick ? `消去音${Math.min(6, this.chain)}` : undefined;
        this.chain = trick ? this.chain + 1 : 0;
        this.erased++;
        this.undo = null;
        if (this.erased === this.layout.height) {
            if (!trick || !this.acceptsTrick(trick.name)) return { failed: true };
            this.stage++;
            this.phase = "recoveryReview";
        }
        return { trick: trick?.name, sound, message: trick ? `${trick.name}が成立しました！` : undefined };
    }
    private acceptsTrick(name: string): boolean { return this.lesson.id === "row" ? name.startsWith("一列揃え(") : this.lesson.id === "crack" ? name.startsWith("地割れ(") : this.lesson.id === "shift" ? name.startsWith("地殻変動(") : this.lesson.id === "fang" ? name.startsWith("牙(") : name === this.lesson.name; }
    private matches(target: Pentiamond): boolean {
        const key = (piece: Pentiamond) => piece.g$states.map(([x, y, , d]) => `${x},${y},${d}`).sort().join(";");
        return !!this.hand && !!target && this.hand.g$kind === target.g$kind && key(this.hand) === key(target);
    }
    private makeQueue(sequence: BlockKind[]): BlockKind[] {
        const last = sequence.slice(sequence.length - sequence.length % 6);
        return [...sequence, ...kinds.filter((kind) => !last.includes(kind)), ...kinds, ...kinds];
    }
    private takeNext(): BlockKind { if (this.queue.length <= Settings.next.length) this.queue.push(...kinds); return this.queue.shift()!; }
    private spawnNext(): void { this.spawn(this.takeNext()); }
    private spawn(kind: BlockKind): void { this.hand = new Pentiamond(Settings.initialX, Settings.initialY, kind); this.blocks.displayPentiamond(this.hand); }
}
